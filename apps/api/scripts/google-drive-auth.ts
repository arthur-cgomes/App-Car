import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

const envFile = join(__dirname, '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const folderName = process.argv[2] ?? 'App Car';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

if (!clientId || !clientSecret) {
  console.error('Defina GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET no apps/api/.env antes de rodar.');
  process.exit(1);
}

const state = randomBytes(16).toString('hex');
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname !== '/callback') return void res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (url.searchParams.get('state') !== state || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Autorização recusada ou inválida.');
    return finish(new Error(url.searchParams.get('error') ?? 'state inválido'));
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Pronto! Pode fechar esta aba e voltar ao terminal.');
  exchange(code).then(() => finish(), finish);
});

server.listen(0, '127.0.0.1', () => {
  const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  consent.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();
  console.log(`Abra no navegador e entre com a conta Google que vai guardar os arquivos:\n\n${consent}\n`);
  execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [consent.toString()], () => undefined);
});

function redirectUri() {
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/callback`;
}

async function exchange(code: string) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ code, client_id: clientId!, client_secret: clientSecret!, redirect_uri: redirectUri(), grant_type: 'authorization_code' }),
  });
  const tokens = (await tokenResponse.json()) as { access_token?: string; refresh_token?: string; error_description?: string };
  if (!tokens.access_token || !tokens.refresh_token) throw new Error(tokens.error_description ?? 'O Google não devolveu o refresh token.');

  const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = (await folderResponse.json()) as { id?: string };
  if (!folder.id) throw new Error(`Não foi possível criar a pasta "${folderName}" no Drive.`);

  console.log(`Pasta "${folderName}" criada no seu Drive. Copie para o apps/api/.env:\n`);
  console.log('STORAGE_PROVIDER=gdrive');
  console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log(`GOOGLE_DRIVE_FOLDER_ID=${folder.id}\n`);
}

function finish(error?: unknown) {
  server.close();
  if (error) {
    console.error(`Falhou: ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
