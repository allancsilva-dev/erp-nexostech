import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

export function IsPhone() {
  return applyDecorators(
    IsString(),
    Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
      message: 'Telefone deve estar no formato (00) 00000-0000',
    }),
  );
}
