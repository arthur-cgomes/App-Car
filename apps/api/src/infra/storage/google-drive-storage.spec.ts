import { text } from 'node:stream/consumers';
import { GoogleDriveStorage } from './google-drive-storage';

const options = { clientId: 'id', clientSecret: 'secret', refreshToken: 'refresh', folderId: 'pasta' };

describe('GoogleDriveStorage', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockImplementation(async (url) =>
      String(url).startsWith('https://oauth2.googleapis.com/token')
        ? Response.json({ access_token: 'token-1', expires_in: 3600 })
        : Response.json({ id: 'arquivo-1' }),
    );
  });

  it('envia o arquivo para a pasta configurada e reaproveita o access token', async () => {
    const drive = new GoogleDriveStorage(options);
    expect(await drive.put('users_u1_f1', Buffer.from('conteudo'), 'image/jpeg')).toBe('arquivo-1');
    await drive.put('users_u1_f2', Buffer.from('outro'), 'image/png');

    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('oauth2'));
    expect(tokenCalls).toHaveLength(1);
    expect(String((tokenCalls[0][1]!.body as URLSearchParams).get('grant_type'))).toBe('refresh_token');

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
    const body = (init!.body as Buffer).toString();
    expect(body).toContain('{"name":"users_u1_f1","mimeType":"image/jpeg","parents":["pasta"]}');
    expect(body).toContain('Content-Type: image/jpeg\r\n\r\nconteudo\r\n');
  });

  it('lê o conteúdo e trata arquivo já apagado como removido', async () => {
    const drive = new GoogleDriveStorage(options);
    fetchMock.mockImplementation(async (url, init) => {
      if (String(url).includes('oauth2')) return Response.json({ access_token: 't', expires_in: 3600 });
      if (init?.method === 'DELETE') return new Response(null, { status: 404 });
      return new Response('bytes da foto');
    });
    expect(await text(await drive.get('arquivo-1'))).toBe('bytes da foto');
    await expect(drive.delete('arquivo-1')).resolves.toBeUndefined();
  });

  it('falha com a resposta do Google quando o upload é recusado', async () => {
    const drive = new GoogleDriveStorage(options);
    fetchMock.mockImplementation(async (url) =>
      String(url).includes('oauth2') ? Response.json({ access_token: 't', expires_in: 3600 }) : new Response('quota', { status: 403 }),
    );
    await expect(drive.put('x', Buffer.from('y'), 'image/png')).rejects.toThrow('Google Drive respondeu 403: quota');
  });
});
