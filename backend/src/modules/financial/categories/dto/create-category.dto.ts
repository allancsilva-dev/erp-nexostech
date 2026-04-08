import {
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'Nome deve ser um texto valido' })
  @MinLength(2, { message: 'Nome deve ter no minimo 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no maximo 100 caracteres' })
  name!: string;

  @IsIn(['RECEIVABLE', 'PAYABLE'], {
    message: 'Tipo deve ser RECEIVABLE ou PAYABLE',
  })
  type!: 'RECEIVABLE' | 'PAYABLE';

  @IsOptional()
  @IsUUID('4', { message: 'Categoria pai invalida' })
  parentId?: string;

  @IsOptional()
  @IsHexColor({ message: 'Cor invalida. Use o formato hexadecimal' })
  color?: string;

  @IsOptional()
  @IsInt({ message: 'Ordem deve ser um numero inteiro' })
  @Min(0, { message: 'Ordem deve ser maior ou igual a zero' })
  sortOrder?: number;
}
