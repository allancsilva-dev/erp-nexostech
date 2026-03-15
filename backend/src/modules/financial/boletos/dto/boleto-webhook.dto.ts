import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class BoletoWebhookDto {
  @IsString()
  boletoId!: string;

  @IsString()
  entryId!: string;

  @IsIn(['PENDING', 'PAID', 'CANCELED', 'FAILED'])
  status!: 'PENDING' | 'PAID' | 'CANCELED' | 'FAILED';

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
