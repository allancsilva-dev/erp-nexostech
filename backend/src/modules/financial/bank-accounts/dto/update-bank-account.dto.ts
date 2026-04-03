import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { BankAccountType } from './create-bank-account.dto';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser um texto valido' })
  @MaxLength(100, { message: 'Nome deve ter no maximo 100 caracteres' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Codigo do banco deve ser um texto valido' })
  @MaxLength(10, { message: 'Codigo do banco deve ter no maximo 10 caracteres' })
  bankCode?: string;

  @IsOptional()
  @IsString({ message: 'Agencia deve ser um texto valido' })
  @MaxLength(10, { message: 'Agencia deve ter no maximo 10 caracteres' })
  agency?: string;

  @IsOptional()
  @IsString({ message: 'Numero da conta deve ser um texto valido' })
  @MaxLength(20, { message: 'Numero da conta deve ter no maximo 20 caracteres' })
  accountNumber?: string;

  @IsOptional()
  @IsEnum(BankAccountType, { message: 'Tipo de conta invalido' })
  type?: BankAccountType;

  @IsOptional()
  @Matches(/^\d+\.\d{2}$/, {
    message: 'Saldo inicial invalido. Informe um numero com 2 casas decimais',
  })
  initialBalance?: string;
}
