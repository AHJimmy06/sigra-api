import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

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
  constructor(private readonly db: DataSource) {}
  async metrics() {
    const accessRows = await this.db.query<AccessMetric[]>(
      `SELECT count(*) FILTER (WHERE decision = 'ALLOWED')::int AS allowed, count(*) FILTER (WHERE decision = 'DENIED')::int AS denied FROM access_events WHERE occurred_at >= CURRENT_DATE`,
    );
    const ticketRows = await this.db.query<TicketMetric[]>(
      `SELECT count(*)::int AS incidents FROM maintenance_tickets WHERE status <> 'RESOLVED'`,
    );
    const flow = await this.db.query<FlowMetric[]>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS date, count(a.id)::int AS total FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day LEFT JOIN access_events a ON a.occurred_at >= day AND a.occurred_at < day + INTERVAL '1 day' GROUP BY day ORDER BY day`,
    );
    return {
      today: accessRows[0] ?? { allowed: 0, denied: 0 },
      openIncidents: ticketRows[0]?.incidents ?? 0,
      flow,
    };
  }
}
