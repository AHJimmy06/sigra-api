import { UnitsService } from './units.service';
import { CreateUnitDto } from './unit.dto';
import { ResidentialUnit } from './unit.entity';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

describe('UnitsService', () => {
  it('creates and persists a residential unit', async () => {
    const repository = {
      create: jest.fn((value: CreateUnitDto) => value),
      save: jest.fn((value: CreateUnitDto) =>
        Promise.resolve({ id: 'unit-1', ...value } as ResidentialUnit),
      ),
    };
    const service = new UnitsService(repository as never);
    await expect(
      service.create({
        code: 'A-101',
        address: '101 Main Street',
        parkingSpaces: 2,
      }),
    ).resolves.toMatchObject({ id: 'unit-1', parkingSpaces: 2 });
    expect(repository.save).toHaveBeenCalledTimes(1);
  });

  it('translates a linked-unit foreign key failure to a conflict', async () => {
    const repository = {
      delete: jest.fn().mockRejectedValue(
        new QueryFailedError('DELETE FROM units', [], {
          code: '23503',
        } as Error),
      ),
    };
    const service = new UnitsService(repository as never);

    await expect(service.remove('unit-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
