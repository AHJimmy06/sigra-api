import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { configureHttpApp } from './common/http/configure-http-app';
import { createOpenApiDocument } from './openapi/openapi';

async function bootstrap() {
  mkdirSync(resolve(process.env.UPLOAD_DIRECTORY ?? 'uploads'), {
    recursive: true,
  });

  const app = await NestFactory.create(AppModule);
  configureHttpApp(app);

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.enableShutdownHooks();

  const document = createOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
