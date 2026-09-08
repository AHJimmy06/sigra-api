import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface AccessMetric {
  allowed: number;
  denied: number;
}
export interface TicketMetric {
  incidents: number;
}
export interface FlowMetric {
  date: string;
  total: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  async metrics() {
    const timeZone = this.config.get<string>(
      'RESIDENTIAL_TIME_ZONE',
      'America/Guayaquil',
    );
    const accessRows = await this.db.query<AccessMetric[]>(
      `SELECT count(*) FILTER (WHERE decision = 'ALLOWED')::int AS allowed, count(*) FILTER (WHERE decision = 'DENIED')::int AS denied FROM access_events WHERE occurred_at >= ((now() AT TIME ZONE $1)::date AT TIME ZONE $1)`,
      [timeZone],
    );
    const ticketRows = await this.db.query<TicketMetric[]>(
      `SELECT count(*)::int AS incidents FROM maintenance_tickets WHERE status <> 'RESOLVED'`,
    );
    const flow = await this.db.query<FlowMetric[]>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS date, count(a.id)::int AS total FROM generate_series((now() AT TIME ZONE $1)::date - INTERVAL '6 days', (now() AT TIME ZONE $1)::date, INTERVAL '1 day') day LEFT JOIN access_events a ON a.occurred_at >= (day AT TIME ZONE $1) AND a.occurred_at < ((day + INTERVAL '1 day') AT TIME ZONE $1) GROUP BY day ORDER BY day`,
      [timeZone],
    );
    return {
      today: accessRows[0] ?? { allowed: 0, denied: 0 },
      openIncidents: ticketRows[0]?.incidents ?? 0,
      flow,
    };
  }
}
