import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { withRetry } from '../../../common/utils/retry.util';

type GeneratePayload = {
  entryId: string;
  amount: string;
  dueDate: string;
};

type GatewayResponse = {
  boletoId: string;
  status: string;
  pdfUrl: string;
};

@Injectable()
export class BoletosGatewayClient {
  private readonly gatewayUrl: string;
  private readonly gatewayToken: string | null;
  private readonly generateBreaker: CircuitBreaker<
    [GeneratePayload],
    GatewayResponse
  >;
  private readonly cancelBreaker: CircuitBreaker<
    [string],
    { success: boolean }
  >;

  constructor(private readonly configService: ConfigService) {
    this.gatewayUrl =
      this.configService.get<string>('BOLETOS_GATEWAY_URL') ?? '';
    this.gatewayToken =
      this.configService.get<string>('BOLETOS_GATEWAY_TOKEN') ?? null;

    const options = {
      timeout: 10_000,
      errorThresholdPercentage: 50,
      resetTimeout: 30_000,
    };

    this.generateBreaker = new CircuitBreaker((payload: GeneratePayload) => {
      return withRetry(() => this.generateOnGateway(payload));
    }, options);

    this.cancelBreaker = new CircuitBreaker((boletoId: string) => {
      return withRetry(() => this.cancelOnGateway(boletoId));
    }, options);

    this.generateBreaker.fallback(() => {
      throw new BusinessException('GATEWAY_UNAVAILABLE');
    });

    this.cancelBreaker.fallback(() => {
      throw new BusinessException('GATEWAY_UNAVAILABLE');
    });
  }

  async generate(payload: GeneratePayload): Promise<GatewayResponse> {
    return this.generateBreaker.fire(payload);
  }

  async cancel(boletoId: string): Promise<{ success: boolean }> {
    return this.cancelBreaker.fire(boletoId);
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return null;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.gatewayToken) {
      headers.Authorization = `Bearer ${this.gatewayToken}`;
    }

    return headers;
  }

  private getBaseUrl(): string {
    const baseUrl = this.gatewayUrl.trim();
    if (!baseUrl) {
      throw new BusinessException('GATEWAY_NOT_CONFIGURED');
    }

    return baseUrl.replace(/\/+$/, '');
  }

  private async readJsonRecord(
    response: Response,
  ): Promise<Record<string, unknown>> {
    try {
      const parsed: unknown = await response.json();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private async parseGatewayError(response: Response): Promise<never> {
    const fallback = `Gateway de boletos retornou HTTP ${response.status}`;
    const body = await this.readJsonRecord(response);

    const message =
      this.toNullableText(body?.message) ??
      this.toNullableText(body?.error) ??
      fallback;

    throw new BusinessException(
      'INTERNAL_GATEWAY_ERROR',
      HttpStatus.BAD_GATEWAY,
      {
        gatewayMessage: message,
        gatewayStatus: response.status,
      },
    );
  }

  private async generateOnGateway(
    payload: GeneratePayload,
  ): Promise<GatewayResponse> {
    const response = await fetch(`${this.getBaseUrl()}/boletos`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await this.parseGatewayError(response);
    }

    const body = await this.readJsonRecord(response);

    const boletoId = this.toNullableText(body.boletoId ?? body.id);
    const status = this.toNullableText(body.status) ?? 'PENDING';
    const pdfUrl = this.toNullableText(body.pdfUrl ?? body.pdf_url) ?? '';

    if (!boletoId || !pdfUrl) {
      throw new BusinessException('GATEWAY_INVALID_RESPONSE');
    }

    return {
      boletoId,
      status,
      pdfUrl,
    };
  }

  private async cancelOnGateway(
    boletoId: string,
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.getBaseUrl()}/boletos/${encodeURIComponent(boletoId)}`,
      {
        method: 'DELETE',
        headers: this.buildHeaders(),
      },
    );

    if (!response.ok) {
      await this.parseGatewayError(response);
    }

    return { success: true };
  }
}
