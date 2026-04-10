import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateEntryDto {
  @IsOptional()
  @IsString({ message: 'Descricao deve ser um texto valido' })
  @MinLength(3, { message: 'Descricao deve ter no minimo 3 caracteres' })
  @MaxLength(200, { message: 'Descricao deve ter no maximo 200 caracteres' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Valor deve ser um texto valido' })
  @Matches(/^\d+\.\d{2}$/, {
    message:
      'Valor monetario invalido. Informe um numero positivo com 2 casas decimais',
  })
  amount?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de vencimento invalida' })
  dueDate?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Categoria invalida' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Contato invalido' })
  contactId?: string;
}
