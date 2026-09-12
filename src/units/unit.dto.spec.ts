import { mapUnitResponse, normalizeUnitInput } from './unit.dto';

describe('unit response contract', () => {
  it('trims unit code and address without changing boolean active', () => {
    expect(
      normalizeUnitInput({
        code: ' a-101 ',
        address: ' 101 Main Street ',
        active: false,
      }),
    ).toEqual({ code: 'a-101', address: '101 Main Street', active: false });
  });

  it('allowlists the unit projection without resident data', () => {
    expect(
      mapUnitResponse({
        id: 'unit-1',
        code: 'A-101',
        address: '101 Main Street',
        parkingSpaces: 2,
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        residents: [{ email: 'resident@example.com', passwordHash: 'secret' }],
      } as never),
    ).toEqual({
      id: 'unit-1',
      code: 'A-101',
      address: '101 Main Street',
      parkingSpaces: 2,
      active: true,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});
