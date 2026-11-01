import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { ApiKey } from './api-key.entity';

export const API_KEY_HEADER = 'x-api-key';
const KEY_PREFIX = 'ac_live_';
const MAX_KEYS = 10;
const REQUESTS_PER_MINUTE = 60;

const hash = (key: string) => createHash('sha256').update(key).digest('hex');

export interface ApiKeyView {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey) private readonly keys: Repository<ApiKey>,
    private readonly limiter: RateLimiter,
  ) {}

  async list(userId: string): Promise<ApiKeyView[]> {
    const keys = await this.keys.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return keys.map(toView);
  }

  async create(userId: string, name: string): Promise<ApiKeyView & { key: string }> {
    if ((await this.keys.count({ where: { userId } })) >= MAX_KEYS) {
      throw new BadRequestException(`Limite de ${MAX_KEYS} chaves ativas. Revogue uma antes de criar outra.`);
    }
    const key = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
    const saved = await this.keys.save(this.keys.create({ userId, name, prefix: key.slice(0, 12), keyHash: hash(key), lastUsedAt: null }));
    return { ...toView(saved), key };
  }

  async revoke(userId: string, id: string) {
    const key = await this.keys.findOne({ where: { id, userId } });
    if (!key) throw new NotFoundException('Chave não encontrada');
    await this.keys.softRemove(key);
  }

  async authenticate(key: string | undefined): Promise<string> {
    if (!key?.startsWith(KEY_PREFIX)) throw new UnauthorizedException('Chave de API inválida.');
    const found = await this.keys.findOne({ where: { keyHash: hash(key) }, relations: { user: true } });
    if (!found?.user) throw new UnauthorizedException('Chave de API inválida.');
    await this.limiter.consume(`api-key:${found.id}`, REQUESTS_PER_MINUTE, 60, (retryAfter) => `Limite de requisições atingido. Tente novamente em ${retryAfter} s.`);
    await this.keys.update({ id: found.id }, { lastUsedAt: new Date() });
    return found.userId;
  }
}

function toView(key: ApiKey): ApiKeyView {
  return { id: key.id, name: key.name, prefix: key.prefix, lastUsedAt: key.lastUsedAt, createdAt: key.createdAt };
}
