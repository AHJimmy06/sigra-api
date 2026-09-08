import { BadRequestException, ValidationError } from '@nestjs/common';

export type HttpErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export type HttpErrorBody = {
  code: HttpErrorCode;
  message: string;
  requestId: string;
  details: Record<string, string[]>;
};

export const SAFE_PUBLIC_4XX_MESSAGES = new Set([
  'Bearer token required',
  'Invalid or expired token',
  'Invalid credentials',
  'Insufficient role',
  'Announcement not found',
  'Unit not found',
  'Unit cannot be deleted while residents are linked to it',
  'Active resident not found',
  'Pass not found',
  'Active pass not found',
  'Uploaded file content does not match a supported image type',
  'Ticket image not found',
  'Ticket not found',
  'Resident not found',
  'Email is already registered',
  'Unit code is already registered',
  'Unit must exist and be active',
  'Unit cannot be deactivated while active residents are linked to it',
  'Invalid ticket status transition',
  'Invalid image name',
  'Client event ID was already used for a different validation request',
]);

export class ContractValidationException extends BadRequestException {
  constructor(readonly details: Record<string, string[]>) {
    super('Validation failed');
  }
}

export function normalizeValidationErrors(
  errors: readonly ValidationError[],
): Record<string, string[]> {
  const messages = new Map<string, Set<string>>();
  const visit = (nodes: readonly ValidationError[], parent = '') => {
    for (const node of nodes) {
      const path = parent ? `${parent}.${node.property}` : node.property;
      const constraints = node.constraints
        ? Object.values(node.constraints)
        : [];
      if (constraints.length) {
        const current = messages.get(path) ?? new Set<string>();
        constraints.forEach((message) => current.add(message));
        messages.set(path, current);
      }
      if (node.children?.length) visit(node.children, path);
    }
  };
  visit(errors);
  return Object.fromEntries(
    [...messages.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, values]) => [
        path,
        [...values].sort((a, b) => a.localeCompare(b)),
      ]),
  );
}
