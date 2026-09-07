import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred on the server.';
    let details: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (status === HttpStatus.BAD_REQUEST) {
        errorCode = 'VALIDATION_ERROR';
        message = 'The request contains invalid data.';

        // Manejo estructurado de los errores de validación de class-validator
        if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null
        ) {
          const errorPayload = exceptionResponse as Record<string, any>;
          if (Array.isArray(errorPayload.message)) {
            details = this.formatValidationErrors(errorPayload.message);
          } else {
            details = { general: [errorPayload.message || message] };
          }
        }
      } else if (status === HttpStatus.UNAUTHORIZED) {
        errorCode = 'UNAUTHORIZED';
        message = 'Authentication token is missing, invalid, or expired.';
      } else if (status === HttpStatus.FORBIDDEN) {
        errorCode = 'FORBIDDEN';
        message = 'You do not have permission to access this resource.';
      } else if (status === HttpStatus.NOT_FOUND) {
        errorCode = 'NOT_FOUND';
        message = 'The requested resource was not found.';
      } else if (status === HttpStatus.CONFLICT) {
        errorCode = 'CONFLICT';
        message =
          'A conflict occurred with a business rule or duplicate entry.';
      } else {
        message = exception.message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Respuesta normalizada bajo el contrato de la Fase 0
    response.status(status).json({
      code: errorCode,
      message,
      ...(details && { details }),
      requestId,
    });
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    messages.forEach((msg) => {
      // Intentamos extraer el campo de manera amigable o lo asignamos a general
      const propertyKey = 'fields';
      if (!formattedErrors[propertyKey]) {
        formattedErrors[propertyKey] = [];
      }
      formattedErrors[propertyKey].push(msg);
    });

    return formattedErrors;
  }
}
