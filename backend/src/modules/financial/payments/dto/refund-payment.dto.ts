import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RefundPaymentDto {
  @IsUUID('4', { message: 'paymentId deve ser um UUID valido' })
  paymentId!: string;

  @IsString({ message: 'Motivo deve ser um texto valido' })
  @MinLength(10, { message: 'Motivo deve ter no minimo 10 caracteres' })
  @MaxLength(500, { message: 'Motivo deve ter no maximo 500 caracteres' })
  reason!: string;
}
