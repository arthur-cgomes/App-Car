export function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|mif1|msf1)$/.test(buffer.toString('ascii', 8, 12))) {
    return 'image/heic';
  }
  return null;
}
