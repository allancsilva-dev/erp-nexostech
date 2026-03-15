import { IsDateString, IsIn } from 'class-validator';

export class ExportReportDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsIn(['csv', 'json'])
  format!: 'csv' | 'json';
}
