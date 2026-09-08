import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  OpenAPIObject,
  OperationObject,
  SwaggerModule,
} from '@nestjs/swagger';

const PUBLIC_OPERATIONS = new Set([
  'GET /api',
  'GET /api/health',
  'POST /api/auth/login',
]);

const ERROR_STATUSES = ['400', '401', '403', '404', '409', '429', '500'];

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('SIGRA API')
    .setDescription('Official SIGRA Phase 0 HTTP contract')
    .setVersion('1.0.0')
    .addServer('/')
    .addBearerAuth(undefined, 'bearer')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.Phase0Error = {
    type: 'object',
    required: ['code', 'message', 'details', 'requestId'],
    properties: {
      code: {
        type: 'string',
        enum: [
          'VALIDATION_ERROR',
          'BAD_REQUEST',
          'UNAUTHORIZED',
          'FORBIDDEN',
          'NOT_FOUND',
          'CONFLICT',
          'RATE_LIMITED',
          'INTERNAL_ERROR',
        ],
      },
      message: { type: 'string' },
      details: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      requestId: { type: 'string' },
    },
  };

  for (const [path, pathItem] of Object.entries(document.paths)) {
    const operations = Object.entries(pathItem ?? {}) as [string, unknown][];
    for (const [method, value] of operations) {
      const operation = value as OperationObject | undefined;
      if (!operation || typeof operation !== 'object') continue;
      const operationKey = `${method.toUpperCase()} ${path}`;
      if (!PUBLIC_OPERATIONS.has(operationKey)) {
        operation.security = [{ bearer: [] }];
      }
      for (const status of ERROR_STATUSES) {
        operation.responses[status] ??= {
          description: `Phase 0 error (${status})`,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Phase0Error' },
            },
          },
        };
      }
    }
  }
  return document;
}
