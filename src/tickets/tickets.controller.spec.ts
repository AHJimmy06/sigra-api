import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Role } from '../common/role.enum';
import { MaintenanceTicket } from './ticket.entity';
import { TicketImageStorage } from './ticket-image.storage';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

const resident = {
  sub: 'user-1',
  email: 'resident@example.com',
  role: Role.RESIDENT,
  residentId: 'resident-1',
};
const dto = {
  clientRequestId: '2ce0c36d-5ac0-4e39-9d64-d29a967e95fb',
  description: 'Leaking kitchen pipe',
};
const png = {
  mimetype: 'image/png',
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
} as Express.Multer.File;

describe('TicketsController uploads', () => {
  let directory: string;
  let previousUploadDirectory: string | undefined;
  let storage: TicketImageStorage;

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), 'sigra-ticket-create-'));
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

  it('does not write a file for an already completed request', async () => {
    const existing = { imageName: 'retained.png' } as MaintenanceTicket;
    await fs.writeFile(join(directory, existing.imageName), png.buffer);
    const tickets = {
      findByClientRequestId: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
    };
    const controller = new TicketsController(
      tickets as unknown as TicketsService,
      storage,
    );

    await expect(controller.create(resident, dto, png)).resolves.toBe(existing);
    await expect(fs.readdir(directory)).resolves.toEqual(['retained.png']);
    expect(tickets.create).not.toHaveBeenCalled();
  });

  it('removes the losing file when concurrent creation returns the winner', async () => {
    const winner = { imageName: 'retained.png' } as MaintenanceTicket;
    await fs.writeFile(join(directory, winner.imageName), png.buffer);
    const tickets = {
      findByClientRequestId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(winner),
    };
    const controller = new TicketsController(
      tickets as unknown as TicketsService,
      storage,
    );

    await expect(controller.create(resident, dto, png)).resolves.toBe(winner);
    await expect(fs.readdir(directory)).resolves.toEqual(['retained.png']);
  });

  it('removes the stored file when database creation fails', async () => {
    const tickets = {
      findByClientRequestId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const controller = new TicketsController(
      tickets as unknown as TicketsService,
      storage,
    );

    await expect(controller.create(resident, dto, png)).rejects.toThrow(
      'database unavailable',
    );
    await expect(fs.readdir(directory)).resolves.toEqual([]);
  });
});
