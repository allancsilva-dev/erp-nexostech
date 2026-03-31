import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

export function IsPhone() {
  return applyDecorators(
    IsString(),
    Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
      message: "Informe um telefone válido: (00) 0000-0000 ou (00) 00000-0000",
    }),
  );
}
