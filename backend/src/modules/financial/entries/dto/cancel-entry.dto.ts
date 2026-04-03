import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelEntryDto {
  @IsOptional()
  @IsString({ message: 'Motivo deve ser um texto valido' })
  @MinLength(10, { message: 'Motivo deve ter no minimo 10 caracteres' })
  @MaxLength(500, { message: 'Motivo deve ter no maximo 500 caracteres' })
  reason?: string;
}
