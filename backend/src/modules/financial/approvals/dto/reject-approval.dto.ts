import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectApprovalDto {
  @IsString({ message: 'Motivo deve ser um texto valido' })
  @MinLength(3, { message: 'Motivo deve ter no minimo 3 caracteres' })
  @MaxLength(500, { message: 'Motivo deve ter no maximo 500 caracteres' })
  reason!: string;
}
