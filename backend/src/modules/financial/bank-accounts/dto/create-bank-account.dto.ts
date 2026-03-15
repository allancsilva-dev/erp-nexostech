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
  @IsUUID()
  branchId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  agency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountNumber?: string;

  @IsEnum(BankAccountType)
  type!: BankAccountType;

  @Matches(/^\d+\.\d{2}$/)
  initialBalance!: string;
}
