import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export type AnnouncementPatchCommand =
  | { kind: 'CONTENT'; title?: string; body?: string }
  | { kind: 'PUBLICATION'; published: boolean };

@Injectable()
export class AnnouncementPatchPipe implements PipeTransform {
  transform(value: unknown): AnnouncementPatchCommand {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Invalid announcement patch');
    }
    const input = value as Record<string, unknown>;
    const keys = Object.keys(input);
    if (
      keys.length === 1 &&
      keys[0] === 'published' &&
      typeof input.published === 'boolean'
    ) {
      return { kind: 'PUBLICATION', published: input.published };
    }
    if (keys.length && keys.every((key) => key === 'title' || key === 'body')) {
      if (
        (input.title !== undefined &&
          (typeof input.title !== 'string' ||
            input.title.trim().length < 5 ||
            input.title.length > 160)) ||
        (input.body !== undefined &&
          (typeof input.body !== 'string' ||
            input.body.trim().length < 10 ||
            input.body.length > 2000))
      ) {
        throw new BadRequestException('Invalid announcement patch');
      }
      return {
        kind: 'CONTENT',
        ...(value as { title?: string; body?: string }),
      };
    }
    throw new BadRequestException('Invalid announcement patch');
  }
}
