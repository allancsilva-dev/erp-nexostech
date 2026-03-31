import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

export function IsCep() {
  return applyDecorators(
    IsString(),
    Matches(/^(\d{5}-\d{3}|\d{8})$/, {
      message: 'Informe um CEP válido no formato 00000-000',
    }),
  );
}
