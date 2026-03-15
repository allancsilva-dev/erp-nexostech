import { IsOptional, IsUUID } from 'class-validator';

export class MatchReconciliationDto {
  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsUUID()
  entryId?: string;
}
