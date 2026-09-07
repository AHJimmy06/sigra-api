import { User } from '../users/user.entity';
import { Resident } from './resident.entity';
import { ResidentsService } from './residents.service';

describe('ResidentsService', () => {
  it.each([true, false])(
    'updates the resident and linked user active state to %s atomically',
    async (active) => {
      const resident = { id: 'resident-1', active: !active } as Resident;
      const saved = { ...resident, active };
      const residentRepository = {
        findOneBy: jest.fn().mockResolvedValue(resident),
        merge: jest.fn().mockReturnValue(saved),
        save: jest.fn().mockResolvedValue(saved),
      };
      const userRepository = { update: jest.fn().mockResolvedValue(undefined) };
      const manager = {
        getRepository: jest.fn((entity: typeof Resident | typeof User) =>
          entity === Resident ? residentRepository : userRepository,
        ),
      };
      const dataSource = {
        transaction: jest.fn(
          (work: (value: typeof manager) => Promise<Resident>) => work(manager),
        ),
      };
      const service = new ResidentsService({} as never, dataSource as never);

      await expect(service.update(resident.id, { active })).resolves.toBe(
        saved,
      );
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(userRepository.update).toHaveBeenCalledWith(
        { residentId: resident.id },
        { active },
      );
    },
  );
});
