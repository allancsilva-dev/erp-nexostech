import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ImportReconciliationDto {
  @IsUUID()
  bankAccountId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  branchIdOverride?: string;
}
