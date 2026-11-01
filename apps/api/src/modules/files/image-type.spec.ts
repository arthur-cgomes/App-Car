import { detectImageType } from './image-type';

describe('detectImageType', () => {
  it('reconhece JPEG, PNG, WebP e HEIC pelos bytes iniciais', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('image/png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'ascii'))).toBe('image/webp');
    expect(detectImageType(Buffer.from('\0\0\0\x18ftypheic\0\0', 'ascii'))).toBe('image/heic');
  });

  it('aceita PDF (CRLV digital, apólices)', () => {
    expect(detectImageType(Buffer.from('%PDF-1.7 documento'))).toBe('application/pdf');
  });

  it('recusa outros conteúdos, mesmo com extensão de imagem', () => {
    expect(detectImageType(Buffer.from('PK\x03\x04 arquivo zip'))).toBeNull();
    expect(detectImageType(Buffer.from('<svg xmlns="x">'))).toBeNull();
  });
});
