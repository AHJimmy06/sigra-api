import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('calculates day boundaries in the configured residential time zone', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ allowed: 2, denied: 1 }])
      .mockResolvedValueOnce([{ incidents: 3 }])
      .mockResolvedValueOnce([{ date: '2026-09-08', total: 3 }]);
    const service = new DashboardService(
      { query } as never,
      { get: jest.fn().mockReturnValue('America/Guayaquil') } as never,
    );

    await expect(service.metrics()).resolves.toEqual({
      today: { allowed: 2, denied: 1 },
      openIncidents: 3,
      flow: [{ date: '2026-09-08', total: 3 }],
    });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.not.stringContaining('CURRENT_DATE'),
      ['America/Guayaquil'],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('AT TIME ZONE $1'),
      ['America/Guayaquil'],
    );
  });
});
