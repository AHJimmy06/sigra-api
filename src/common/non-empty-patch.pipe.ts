import { Injectable, PipeTransform } from '@nestjs/common';
import { ContractValidationException } from './http/http-error.contract';

@Injectable()
export class NonEmptyPatchPipe implements PipeTransform<object> {
  transform(value: object) {
    return assertNonEmptyPatch(value);
  }
}

export function assertNonEmptyPatch<T extends object>(value: T): T {
  if (!value || !Object.values(value).some((field) => field !== undefined)) {
    throw new ContractValidationException({
      body: ['PATCH body must include at least one field'],
    }, 'PATCH body must include at least one field');
  }
  return value;
}
