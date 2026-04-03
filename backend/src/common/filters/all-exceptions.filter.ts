import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode, ErrorCodes } from '../exceptions/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<
      Request & {
        requestId?: string;
        user?: { sub?: string; tenantId?: string };
      }
    >();

    const reqId =
      req.requestId ??
      (req.headers['x-request-id'] as string | undefined) ??
      randomUUID();
    const userId = req.user?.sub;
    const tenantId = req.user?.tenantId;
    const branchId = req.headers['x-branch-id'] as string | undefined;

    if (exception instanceof BusinessException) {
      const { code, details } = exception;
      const status = exception.getStatus();

      this.logger.warn({
        code,
        message: ErrorCodes[code],
        details,
        requestId: reqId,
        userId,
        tenantId,
        branchId,
        path: req.url,
      });

      res.status(status).json({
        error: {
          code,
          message: ErrorCodes[code],
          details,
          requestId: reqId,
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as
        | { message?: unknown; error?: string }
        | string;

      if (status === HttpStatus.BAD_REQUEST) {
        const messages =
          typeof body === 'object' && body !== null && Array.isArray(body.message)
            ? body.message
            : null;

        if (messages) {
          const firstMessage = String(messages[0] ?? '');
          const code = this.resolveValidationCode(firstMessage);
          const field = this.extractField(firstMessage);
          const details = { fields: this.extractAllFields(messages.map(String)) };

          this.logger.warn({
            code,
            details,
            requestId: reqId,
            userId,
            tenantId,
            branchId,
            path: req.url,
          });

          res.status(HttpStatus.BAD_REQUEST).json({
            error: {
              code,
              message: ErrorCodes[code],
              ...(field ? { field } : {}),
              details,
              requestId: reqId,
            },
          });
          return;
        }
      }

      const code = this.resolveStatusCode(status);

      this.logger.warn({
        code,
        status,
        requestId: reqId,
        userId,
        tenantId,
        branchId,
        path: req.url,
      });

      res.status(status).json({
        error: {
          code,
          message: ErrorCodes[code],
          requestId: reqId,
        },
      });
      return;
    }

    this.logger.error({
      code: 'INTERNAL_ERROR',
      requestId: reqId,
      userId,
      tenantId,
      branchId,
      path: req.url,
      exception,
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: ErrorCodes.INTERNAL_ERROR,
        requestId: reqId,
      },
    });
  }

  private resolveValidationCode(message: string): ErrorCode {
    const normalized = message.toLowerCase();

    if (
      normalized.includes('must not be empty') ||
      normalized.includes('should not be empty') ||
      normalized.includes('obrigatorio') ||
      normalized.includes('obrigat')
    ) {
      return 'VALIDATION_REQUIRED';
    }
    if (normalized.includes('phone') || normalized.includes('telefone')) {
      return 'VALIDATION_PHONE';
    }
    if (normalized.includes('email') || normalized.includes('e-mail')) {
      return 'VALIDATION_EMAIL';
    }
    if (normalized.includes('cpf') && normalized.includes('cnpj')) {
      return 'VALIDATION_DOCUMENT';
    }
    if (normalized.includes('cpf')) {
      return 'VALIDATION_CPF';
    }
    if (normalized.includes('cnpj')) {
      return 'VALIDATION_CNPJ';
    }
    if (
      normalized.includes('amount') ||
      normalized.includes('decimal') ||
      normalized.includes('valor')
    ) {
      return 'VALIDATION_AMOUNT';
    }
    if (
      normalized.includes('due_date') ||
      normalized.includes('vencimento') ||
      normalized.includes('anterior a data de emissao')
    ) {
      return 'VALIDATION_DATE_ORDER';
    }
    if (normalized.includes('issue_date') || normalized.includes('futura')) {
      return 'VALIDATION_DATE_FUTURE';
    }
    if (
      normalized.includes('installment') ||
      normalized.includes('parcel')
    ) {
      return 'VALIDATION_INSTALLMENTS';
    }
    if (
      normalized.includes('should not exist') ||
      normalized.includes('nao permitido')
    ) {
      return 'VALIDATION_FIELD_UNKNOWN';
    }
    if (
      normalized.includes('arquivo') ||
      normalized.includes('file') ||
      normalized.includes('pdf') ||
      normalized.includes('jpg') ||
      normalized.includes('png')
    ) {
      return 'VALIDATION_FILE';
    }

    return 'VALIDATION_ERROR';
  }

  private extractField(message: string): string | undefined {
    return message.match(/^([a-zA-Z_]+)\s/)?.[1];
  }

  private extractAllFields(messages: string[]): Record<string, string> {
    return messages.reduce<Record<string, string>>((acc, message) => {
      const field = this.extractField(message);

      if (field) {
        acc[field] = ErrorCodes[this.resolveValidationCode(message)];
      }

      return acc;
    }, {});
  }

  private resolveStatusCode(status: number): ErrorCode {
    const map: Record<number, ErrorCode> = {
      400: 'VALIDATION_ERROR',
      401: 'AUTH_UNAUTHORIZED',
      403: 'RBAC_FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'INTERNAL_DUPLICATE_REQUEST',
      413: 'STORAGE_LIMIT_EXCEEDED',
      429: 'AUTH_RATE_LIMIT',
      502: 'INTERNAL_GATEWAY_ERROR',
      503: 'INTERNAL_UNAVAILABLE',
      504: 'INTERNAL_TIMEOUT',
    };

    return map[status] ?? 'INTERNAL_ERROR';
  }
}
