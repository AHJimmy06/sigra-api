import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ContractValidationException,
  HttpErrorBody,
  HttpErrorCode,
  SAFE_PUBLIC_4XX_MESSAGES,
} from './http-error.contract';
import { getRequestId } from './request-id.middleware';

const ERROR_DEFAULTS: Record<number, [HttpErrorCode, string]> = {
  400: ['BAD_REQUEST', 'Bad request'],
  401: ['UNAUTHORIZED', 'Unauthorized'],
  403: ['FORBIDDEN', 'Forbidden'],
  404: ['NOT_FOUND', 'Not found'],
  409: ['CONFLICT', 'Conflict'],
};

export function normalizeHttpException(exception: unknown): {
  status: number;
  body: Omit<HttpErrorBody, 'requestId'>;
} {
  if (exception instanceof ContractValidationException) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: exception.details,
      },
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const defaultEntry = ERROR_DEFAULTS[status];
    if (defaultEntry) {
      const message = getPublicMessage(exception.getResponse());
      return {
        status,
        body: {
          code: defaultEntry[0],
          message:
            message && SAFE_PUBLIC_4XX_MESSAGES.has(message)
              ? message
              : defaultEntry[1],
        },
      };
    }
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
}

function getPublicMessage(response: unknown): string | undefined {
  if (typeof response === 'string') return response;
  if (
    response &&
    typeof response === 'object' &&
    'message' in response &&
    typeof response.message === 'string'
  ) {
    return response.message;
  }
  return undefined;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const normalized = normalizeHttpException(exception);
    const requestId = getRequestId(request);
    response.setHeader('X-Request-Id', requestId);
    response.status(normalized.status).json({ ...normalized.body, requestId });
  }
}
