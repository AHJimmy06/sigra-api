import { AnnouncementStatus } from './announcement.entity';
import { AnnouncementsController } from './announcements.controller';

describe('AnnouncementsController', () => {
  it('delegates detail reads to the administration service', async () => {
    const service = { findOne: jest.fn() };
    const controller = new AnnouncementsController(service as never);

    await controller.findOne('11111111-1111-4111-8111-111111111111');

    expect(service.findOne).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
  });

  it('delegates explicit archive listing filters without a resident actor path', async () => {
    const service = { list: jest.fn() };
    const controller = new AnnouncementsController(service as never);
    const query = {
      page: 1,
      pageSize: 10,
      status: AnnouncementStatus.ARCHIVED,
    };

    await controller.list(query);

    expect(service.list).toHaveBeenCalledWith(query);
  });
});
