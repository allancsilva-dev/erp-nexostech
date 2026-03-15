import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { IsValidDocument } from './is-valid-document.validator';

export function IsDocument() {
  return applyDecorators(
    IsString(),
    Matches(/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/),
    IsValidDocument(),
  );
}
