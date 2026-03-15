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
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description!: string;

  @IsEnum(EntryType)
  type!: EntryType;

  @IsString()
  @Matches(/^\d+\.\d{2}$/)
  amount!: string;

  @IsDateString()
  issueDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  installment?: boolean;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(120)
  installmentCount?: number;

  @IsOptional()
  @IsEnum(Frequency)
  installmentFrequency?: Frequency;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
