import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  mkdirSync(resolve(process.env.UPLOAD_DIRECTORY ?? 'uploads'), {
    recursive: true,
  });

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('SIGRA API')
    .setDescription('Contrato oficial de la Fase 0 para SIGRA')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
