jest.mock('dotenv/config', () => ({}));

import dataSource from './typeorm.datasource';
import { AddVisitorName1724600012000 } from '../migrations/1724600012000-AddVisitorName';

describe('CLI migration registration', () => {
  it('registers the visitor migration without enabling schema synchronization', () => {
    expect(dataSource.options.migrations).toContain(AddVisitorName1724600012000);
    expect(dataSource.options.synchronize).toBe(false);
  });
});
