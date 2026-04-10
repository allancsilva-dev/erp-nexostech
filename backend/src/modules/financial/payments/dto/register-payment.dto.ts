import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '../../entries/dto/create-entry.dto';

export class RegisterPaymentDto {
  @Matches(/^\d+\.\d{2}$/, {
    message:
      'Valor monetario invalido. Informe um numero positivo com 2 casas decimais',
  })
  amount!: string;

  @IsDateString({}, { message: 'Data do pagamento invalida' })
  paymentDate!: string;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Metodo de pagamento invalido' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsUUID('4', { message: 'Conta bancaria invalida' })
  bankAccountId?: string;

  @IsOptional()
  @IsString({ message: 'Observacoes devem ser um texto valido' })
  @MaxLength(500, { message: 'Observacoes devem ter no maximo 500 caracteres' })
  notes?: string;
}
