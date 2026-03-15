import { IsDateString, IsIn } from 'class-validator';

export class ReportExportDto {
  @IsIn(['dre', 'cashflow', 'balance-sheet', 'aging'])
  report!: 'dre' | 'cashflow' | 'balance-sheet' | 'aging';

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsIn(['csv', 'pdf'])
  format!: 'csv' | 'pdf';
}
