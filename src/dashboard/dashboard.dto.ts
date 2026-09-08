import { ApiProperty } from '@nestjs/swagger';

export class AccessMetricDto {
  @ApiProperty() allowed!: number;
  @ApiProperty() denied!: number;
}

export class FlowMetricDto {
  @ApiProperty({ format: 'date' }) date!: string;
  @ApiProperty() total!: number;
}

export class DashboardMetricsResponseDto {
  @ApiProperty({ type: AccessMetricDto }) today!: AccessMetricDto;
  @ApiProperty() openIncidents!: number;
  @ApiProperty({ type: [FlowMetricDto] }) flow!: FlowMetricDto[];
}
