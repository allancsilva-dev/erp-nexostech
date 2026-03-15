import { IsDateString, IsIn } from 'class-validator';

export class ReportExportDto {
  @IsIn(['dre', 'cashflow'])
  report!: 'dre' | 'cashflow';

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsIn(['csv', 'pdf'])
  format!: 'csv' | 'pdf';
}
