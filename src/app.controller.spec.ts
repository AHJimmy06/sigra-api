import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should identify the API', () => {
      expect(appController.getRoot()).toEqual({
        name: 'SIGRA API',
        status: 'ready',
      });
    });
  });

  describe('health', () => {
    it('should report a healthy status', () => {
      const health = appController.getHealth();

      expect(health.status).toBe('ok');
      expect(typeof health.timestamp).toBe('string');
    });
  });
});
