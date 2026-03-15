import { IsDateString } from 'class-validator';

export class ReportPeriodDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
