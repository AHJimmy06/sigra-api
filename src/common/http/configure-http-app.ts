import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  normalizeValidationErrors,
  ContractValidationException,
} from './http-error.contract';
import { HttpExceptionFilter } from './http-exception.filter';
import { requestIdMiddleware } from './request-id.middleware';

const HTTP_APP_CONFIGURED = Symbol('http-app-configured');

export function configureHttpApp(app: INestApplication) {
  const configured = app as INestApplication & {
    [HTTP_APP_CONFIGURED]?: boolean;
  };
  if (configured[HTTP_APP_CONFIGURED]) return;

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new ContractValidationException(normalizeValidationErrors(errors)),
    }),
  );
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  Object.defineProperty(configured, HTTP_APP_CONFIGURED, { value: true });
}
