import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum EntryType {
  PAYABLE = 'PAYABLE',
  RECEIVABLE = 'RECEIVABLE',
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum PaymentMethod {
  BOLETO = 'BOLETO',
  PIX = 'PIX',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export class CreateEntryDto {
  @IsString({ message: 'Descricao deve ser um texto valido' })
  @MinLength(3, { message: 'Descricao deve ter no minimo 3 caracteres' })
  @MaxLength(200, { message: 'Descricao deve ter no maximo 200 caracteres' })
  description!: string;

  @IsEnum(EntryType, { message: 'Tipo de lancamento invalido' })
  type!: EntryType;

  @IsString({ message: 'Valor deve ser um texto valido' })
  @Matches(/^\d+\.\d{2}$/, {
    message: 'Valor monetario invalido. Informe um numero positivo com 2 casas decimais',
  })
  amount!: string;

  @IsDateString({}, { message: 'Data de emissao invalida' })
  issueDate!: string;

  @IsDateString({}, { message: 'Data de vencimento invalida' })
  dueDate!: string;

  @IsUUID('4', { message: 'Categoria invalida' })
  categoryId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'Contato invalido' })
  contactId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Conta bancaria invalida' })
  bankAccountId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'Metodo de pagamento invalido' })
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean({ message: 'Indicador de parcelamento invalido' })
  installment?: boolean;

  @IsOptional()
  @IsInt({ message: 'Numero de parcelas deve ser um numero inteiro' })
  @Min(2, { message: 'Numero de parcelas deve ser entre 2 e 120' })
  @Max(120, { message: 'Numero de parcelas deve ser entre 2 e 120' })
  installmentCount?: number;

  @IsOptional()
  @IsEnum(Frequency, { message: 'Frequencia de parcelamento invalida' })
  installmentFrequency?: Frequency;

  @IsOptional()
  @IsString({ message: 'Observacoes devem ser um texto valido' })
  @MaxLength(500, { message: 'Observacoes devem ter no maximo 500 caracteres' })
  notes?: string;

  @IsOptional()
  @IsBoolean({ message: 'Indicador de envio para aprovacao invalido' })
  submit?: boolean;
}
