import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class NonEmptyPatchPipe implements PipeTransform<Record<string, unknown>> {
  transform(value: Record<string, unknown>) {
    if (!value || Object.keys(value).length === 0) {
      throw new BadRequestException('PATCH body must include at least one field');
    }
    return value;
  }
}
