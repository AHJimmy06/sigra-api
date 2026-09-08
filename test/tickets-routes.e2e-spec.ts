import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { configureHttpApp } from '../src/common/http/configure-http-app';
import { RolesGuard } from '../src/common/roles.guard';
import { TicketImageStorage } from '../src/tickets/ticket-image.storage';
import { TicketsController } from '../src/tickets/tickets.controller';
import { TicketsService } from '../src/tickets/tickets.service';

describe('Ticket image route (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: {
            authorizeImage: () => {
              throw new NotFoundException('Ticket image not found');
            },
          },
        },
        { provide: TicketImageStorage, useValue: { read: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    configureHttpApp(app);
    await app.init();
  });

  it('matches the static image route before the ticket id route', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/tickets/images/11111111-1111-4111-8111-111111111111.png')
      .expect(404);

    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Ticket image not found',
      details: {},
      requestId: response.headers['x-request-id'],
    });
  });

  afterAll(() => app.close());
});
