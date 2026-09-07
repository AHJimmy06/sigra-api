import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class TicketImageStorage {
  private readonly uploadRoot = resolve(
    process.env.UPLOAD_DIRECTORY ?? 'uploads',
  );

  validate(file: Express.Multer.File) {
    const bytes = file.buffer;
    const valid =
      (file.mimetype === 'image/jpeg' &&
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff) ||
      (file.mimetype === 'image/png' &&
        bytes.length >= 8 &&
        bytes
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          )) ||
      (file.mimetype === 'image/webp' &&
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
        bytes.subarray(8, 12).toString('ascii') === 'WEBP');

    if (!extensions[file.mimetype] || !valid) {
      throw new BadRequestException(
        'Uploaded file content does not match a supported image type',
      );
    }
  }

  async store(file: Express.Multer.File) {
    this.validate(file);
    const imageName = `${randomUUID()}${extensions[file.mimetype]}`;
    await fs.writeFile(join(this.uploadRoot, imageName), file.buffer, {
      flag: 'wx',
    });
    return imageName;
  }

  async remove(imageName: string) {
    try {
      await fs.unlink(join(this.uploadRoot, imageName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async read(imageName: string) {
    try {
      return await fs.readFile(join(this.uploadRoot, imageName));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Ticket image not found');
      }
      throw error;
    }
  }

  root() {
    return this.uploadRoot;
  }
}
