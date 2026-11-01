import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import { Env } from '../../config/env';
import { GoogleDriveStorage } from './google-drive-storage';
import { S3Storage } from './s3-storage';

const DRIVE_PREFIX = 'gdrive:';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly provider: Env['STORAGE_PROVIDER'];
  private readonly s3: S3Storage;
  private readonly drive: GoogleDriveStorage | null;

  constructor(config: ConfigService<Env, true>) {
    this.provider = config.get('STORAGE_PROVIDER', { infer: true });
    this.s3 = new S3Storage({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      bucket: config.get('S3_BUCKET', { infer: true }),
      accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
      secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
    });
    const refreshToken = config.get('GOOGLE_DRIVE_REFRESH_TOKEN', { infer: true });
    this.drive = refreshToken
      ? new GoogleDriveStorage({
          clientId: config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true })!,
          clientSecret: config.get('GOOGLE_DRIVE_CLIENT_SECRET', { infer: true })!,
          refreshToken,
          folderId: config.get('GOOGLE_DRIVE_FOLDER_ID', { infer: true })!,
        })
      : null;
  }

  async onModuleInit() {
    if (this.provider === 's3') await this.s3.ensureBucket();
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.provider === 'gdrive') return DRIVE_PREFIX + (await this.requireDrive().put(key.replaceAll('/', '_'), body, contentType));
    await this.s3.put(key, body, contentType);
    return key;
  }

  async get(key: string): Promise<Readable> {
    return key.startsWith(DRIVE_PREFIX) ? this.requireDrive().get(key.slice(DRIVE_PREFIX.length)) : this.s3.get(key);
  }

  async delete(key: string) {
    return key.startsWith(DRIVE_PREFIX) ? this.requireDrive().delete(key.slice(DRIVE_PREFIX.length)) : this.s3.delete(key);
  }

  private requireDrive() {
    if (!this.drive) throw new Error('Google Drive não configurado (GOOGLE_DRIVE_*)');
    return this.drive;
  }
}
