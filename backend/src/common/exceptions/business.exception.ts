import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    status = HttpStatus.UNPROCESSABLE_ENTITY,
  ) {
    super({ error: { code, message, details } }, status);
  }
}
