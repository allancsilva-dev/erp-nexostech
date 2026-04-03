import {
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum CategoryType {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export class CreateCategoryDto {
  @IsString({ message: 'Nome deve ser um texto valido' })
  @MinLength(2, { message: 'Nome deve ter no minimo 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no maximo 100 caracteres' })
  name!: string;

  @IsString({ message: 'Tipo deve ser um texto valido' })
  type!: CategoryType;

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
