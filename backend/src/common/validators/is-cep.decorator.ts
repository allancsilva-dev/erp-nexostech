import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

export function IsCep() {
  return applyDecorators(
    IsString(),
    Matches(/^\d{5}-\d{3}$/, {
      message: 'CEP deve estar no formato 00000-000',
    }),
  );
}
