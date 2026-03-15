import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = request.requestId;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as
        | { error?: Record<string, unknown> }
        | string;

      const normalized =
        typeof body === 'string'
          ? {
              error: {
                code: 'INTERNAL_ERROR',
                message: body,
              },
            }
          : body;

      response.status(status).json({
        ...normalized,
        error: {
          ...(normalized.error ?? {}),
          requestId,
        },
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno inesperado',
        requestId,
      },
    });
  }
}
