import { BadRequestException } from '@nestjs/common';
import { AnnouncementPatchPipe } from './announcement-patch.pipe';

describe('AnnouncementPatchPipe', () => {
  const pipe = new AnnouncementPatchPipe();

  it('classifies permitted content fields without publication state', () => {
    expect(pipe.transform({ title: 'Updated title' })).toEqual({
      kind: 'CONTENT',
      title: 'Updated title',
    });
    expect(pipe.transform({ body: 'An updated announcement body.' })).toEqual({
      kind: 'CONTENT',
      body: 'An updated announcement body.',
    });
  });

  it('accepts only exact publication commands and rejects empty, unknown, and mixed shapes', () => {
    expect(pipe.transform({ published: true })).toEqual({
      kind: 'PUBLICATION',
      published: true,
    });
    for (const value of [
      {},
      { unknown: true },
      { title: 'Valid title', published: true },
    ]) {
      expect(() => pipe.transform(value)).toThrow(BadRequestException);
    }
  });

  it('rejects content fields outside the same create contract bounds', () => {
    expect(() => pipe.transform({ title: 'bad' })).toThrow(BadRequestException);
    expect(() => pipe.transform({ body: 'short' })).toThrow(
      BadRequestException,
    );
  });
});
