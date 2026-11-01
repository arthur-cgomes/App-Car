import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';

export interface GoogleDriveOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export class GoogleDriveStorage {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly options: GoogleDriveOptions) {}

  async put(name: string, body: Buffer, contentType: string): Promise<string> {
    const boundary = `appcar-${randomUUID()}`;
    const metadata = JSON.stringify({ name, mimeType: contentType, parents: [this.options.folderId] });
    const multipart = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
      body,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    const response = await this.request(`${UPLOAD}?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
      signal: AbortSignal.timeout(30_000),
    });
    return ((await response.json()) as { id: string }).id;
  }

  async get(fileId: string): Promise<Readable> {
    const response = await this.request(`${API}/${encodeURIComponent(fileId)}?alt=media`, { signal: AbortSignal.timeout(30_000) });
    return Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
  }

  async delete(fileId: string) {
    await this.request(`${API}/${encodeURIComponent(fileId)}`, { method: 'DELETE', signal: AbortSignal.timeout(15_000) }, [404]);
  }

  private async request(url: string, init: RequestInit, okStatuses: number[] = []) {
    const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${await this.accessToken()}` } });
    if (!response.ok && !okStatuses.includes(response.status)) {
      throw new Error(`Google Drive respondeu ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    return response;
  }

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: this.options.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Google OAuth respondeu ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }
}
