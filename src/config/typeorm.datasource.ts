import 'dotenv/config';
import { DataSource } from 'typeorm';
import { InitialSchema1724600000000 } from '../migrations/1724600000000-InitialSchema';
import { AddAuditLogs1724600001000 } from '../migrations/1724600001000-AddAuditLogs';
import { HardenAccessEvents1724600002000 } from '../migrations/1724600002000-HardenAccessEvents';
import { EnforceUnitParkingLimit1724600003000 } from '../migrations/1724600003000-EnforceUnitParkingLimit';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'sigra',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [
    InitialSchema1724600000000,
    AddAuditLogs1724600001000,
    HardenAccessEvents1724600002000,
    EnforceUnitParkingLimit1724600003000,
  ],
  synchronize: false,
});
