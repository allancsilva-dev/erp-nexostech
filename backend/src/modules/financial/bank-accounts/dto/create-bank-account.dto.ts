import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export enum BankAccountType {
  CORRENTE = 'CORRENTE',
  POUPANCA = 'POUPANCA',
  INVESTIMENTO = 'INVESTIMENTO',
  CAIXA = 'CAIXA',
}

export class CreateBankAccountDto {
  @IsUUID('4', { message: 'Filial invalida' })
  branchId!: string;

  @IsString({ message: 'Nome deve ser um texto valido' })
  @MaxLength(100, { message: 'Nome deve ter no maximo 100 caracteres' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'Codigo do banco deve ser um texto valido' })
  @MaxLength(10, {
    message: 'Codigo do banco deve ter no maximo 10 caracteres',
  })
  bankCode?: string;

  @IsOptional()
  @IsString({ message: 'Agencia deve ser um texto valido' })
  @MaxLength(10, { message: 'Agencia deve ter no maximo 10 caracteres' })
  agency?: string;

  @IsOptional()
  @IsString({ message: 'Numero da conta deve ser um texto valido' })
  @MaxLength(20, {
    message: 'Numero da conta deve ter no maximo 20 caracteres',
  })
  accountNumber?: string;

  @IsEnum(BankAccountType, { message: 'Tipo de conta invalido' })
  type!: BankAccountType;

  @Matches(/^\d+\.\d{2}$/, {
    message: 'Saldo inicial invalido. Informe um numero com 2 casas decimais',
  })
  initialBalance!: string;
}
