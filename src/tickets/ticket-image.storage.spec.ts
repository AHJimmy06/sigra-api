import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TicketImageStorage } from './ticket-image.storage';

function upload(mimetype: string, buffer: Buffer) {
  return { mimetype, buffer } as Express.Multer.File;
}

describe('TicketImageStorage', () => {
  let directory: string;
  let previousUploadDirectory: string | undefined;
  let storage: TicketImageStorage;

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), 'sigra-ticket-images-'));
    previousUploadDirectory = process.env.UPLOAD_DIRECTORY;
    process.env.UPLOAD_DIRECTORY = directory;
    storage = new TicketImageStorage();
  });

  afterEach(async () => {
    if (previousUploadDirectory === undefined)
      delete process.env.UPLOAD_DIRECTORY;
    else process.env.UPLOAD_DIRECTORY = previousUploadDirectory;
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('rejects spoofed image bytes without writing a file', async () => {
    const file = upload('image/png', Buffer.from('not an image'));

    await expect(storage.store(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(fs.readdir(directory)).resolves.toEqual([]);
  });

  it.each([
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), '.jpg'],
    [
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      '.png',
    ],
    ['image/webp', Buffer.from('RIFF0000WEBP', 'ascii'), '.webp'],
  ])('stores valid %s signatures', async (mimetype, bytes, extension) => {
    const name = await storage.store(upload(mimetype, bytes));

    expect(name.endsWith(extension)).toBe(true);
    await expect(fs.readFile(join(directory, name))).resolves.toEqual(bytes);
  });
});
