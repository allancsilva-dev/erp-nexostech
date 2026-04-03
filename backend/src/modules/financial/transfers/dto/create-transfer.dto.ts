import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTransferDto {
  @IsUUID('4', { message: 'Conta de origem invalida' })
  fromAccountId!: string;

  @IsUUID('4', { message: 'Conta de destino invalida' })
  toAccountId!: string;

  @Matches(/^\d+\.\d{2}$/, {
    message: 'Valor monetario invalido. Informe um numero positivo com 2 casas decimais',
  })
  amount!: string;

  @IsDateString({}, { message: 'Data da transferencia invalida' })
  transferDate!: string;

  @IsOptional()
  @IsString({ message: 'Descricao deve ser um texto valido' })
  @MaxLength(200, { message: 'Descricao deve ter no maximo 200 caracteres' })
  description?: string;
}
