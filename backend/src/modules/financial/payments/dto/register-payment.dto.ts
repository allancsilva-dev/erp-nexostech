import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../entries/dto/create-entry.dto';

export class RegisterPaymentDto {
  @Matches(/^\d+\.\d{2}$/)
  amount!: string;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
