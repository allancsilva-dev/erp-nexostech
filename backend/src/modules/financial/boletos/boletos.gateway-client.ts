import { Injectable } from '@nestjs/common';
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
  private readonly generateBreaker: CircuitBreaker<
    [GeneratePayload],
    GatewayResponse
  >;
  private readonly cancelBreaker: CircuitBreaker<
    [string],
    { success: boolean }
  >;

  constructor(private readonly configService: ConfigService) {
    const options = {
      timeout: 10_000,
      errorThresholdPercentage: 50,
      resetTimeout: 30_000,
    };

    this.generateBreaker = new CircuitBreaker(
      async (payload: GeneratePayload) => {
        return withRetry(async () => this.generateOnGateway(payload));
      },
      options,
    );

    this.cancelBreaker = new CircuitBreaker(async (boletoId: string) => {
      return withRetry(async () => this.cancelOnGateway(boletoId));
    }, options);

    this.generateBreaker.fallback(() => {
      throw new BusinessException(
        'GATEWAY_UNAVAILABLE',
        'Servico de boletos indisponivel. Tente novamente em instantes.',
      );
    });

    this.cancelBreaker.fallback(() => {
      throw new BusinessException(
        'GATEWAY_UNAVAILABLE',
        'Servico de boletos indisponivel. Tente novamente em instantes.',
      );
    });
  }

  async generate(payload: GeneratePayload): Promise<GatewayResponse> {
    return this.generateBreaker.fire(payload);
  }

  async cancel(boletoId: string): Promise<{ success: boolean }> {
    return this.cancelBreaker.fire(boletoId);
  }

  private async generateOnGateway(
    payload: GeneratePayload,
  ): Promise<GatewayResponse> {
    const gatewayUrl =
      this.configService.get<string>('BOLETOS_GATEWAY_URL') ??
      'https://gateway.local';
    void gatewayUrl;
    return {
      boletoId: `bol_${payload.entryId}`,
      status: 'PENDING',
      pdfUrl: `https://r2.local/${payload.entryId}.pdf`,
    };
  }

  private async cancelOnGateway(
    _boletoId: string,
  ): Promise<{ success: boolean }> {
    return { success: true };
  }
}
