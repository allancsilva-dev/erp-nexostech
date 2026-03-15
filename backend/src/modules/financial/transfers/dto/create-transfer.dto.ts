import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  fromAccountId!: string;

  @IsUUID()
  toAccountId!: string;

  @Matches(/^\d+\.\d{2}$/)
  amount!: string;

  @IsDateString()
  transferDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
