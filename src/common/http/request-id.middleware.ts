import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID = Symbol('request-id');
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

type RequestWithId = Request & { [REQUEST_ID]?: string };

export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) {
  const candidate = request.headers['x-request-id'];
  const requestId =
    typeof candidate === 'string' && REQUEST_ID_PATTERN.test(candidate)
      ? candidate
      : randomUUID();

  Object.defineProperty(request, REQUEST_ID, {
    configurable: false,
    enumerable: false,
    value: requestId,
    writable: false,
  });
  response.setHeader('X-Request-Id', requestId);
  next();
}

export function getRequestId(request: Request): string {
  const requestId = (request as RequestWithId)[REQUEST_ID];
  if (!requestId) throw new Error('Request ID middleware was not configured');
  return requestId;
}
