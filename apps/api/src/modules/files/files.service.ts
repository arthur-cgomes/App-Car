import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { StorageService } from '../../infra/storage/storage.service';
import { StoredFile } from './file.entity';
import { detectImageType } from './image-type';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(StoredFile) private readonly files: Repository<StoredFile>,
    private readonly storage: StorageService,
  ) {}

  async uploadImage(ownerId: string, buffer: Buffer | undefined) {
    if (!buffer?.length) throw new BadRequestException('Escolha uma foto ou um PDF.');
    const mime = detectImageType(buffer);
    if (!mime) throw new BadRequestException('Envie uma foto (JPEG, PNG, WebP ou HEIC) ou um PDF.');

    const id = randomUUID();
    const storageKey = await this.storage.put(`users/${ownerId}/${id}`, buffer, mime);
    const file = await this.files.save(
      this.files.create({
        id,
        ownerId,
        storageKey,
        mime,
        size: buffer.length,
        sha256: createHash('sha256').update(buffer).digest('hex'),
      }),
    );
    return { id: file.id, mime: file.mime, size: file.size };
  }

  async open(ownerId: string, id: string) {
    const file = await this.files.findOne({ where: { id, ownerId } });
    if (!file) throw new NotFoundException('Arquivo não encontrado');
    return { file, stream: await this.storage.get(file.storageKey) };
  }

  async assertOwned(ownerId: string, ids: string[]) {
    if (ids.length === 0) return;
    const count = await this.files.count({ where: { id: In(ids), ownerId } });
    if (count !== new Set(ids).size) throw new BadRequestException('Foto não encontrada. Envie novamente.');
  }
}
