import { Injectable } from '@nestjs/common';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletoWebhookDto } from './dto/boleto-webhook.dto';
import { GenerateBoletoDto } from './dto/generate-boleto.dto';

@Injectable()
export class BoletosService {
  constructor(private readonly gatewayClient: BoletosGatewayClient) {}

  async list() {
    return [] as Array<{ id: string; status: string; entryId: string }>;
  }

  async generate(entryId: string, dto: GenerateBoletoDto) {
    return this.gatewayClient.generate({
      entryId,
      amount: dto.amount,
      dueDate: dto.dueDate,
    });
  }

  async cancel(entryId: string) {
    return this.gatewayClient.cancel(`bol_${entryId}`);
  }

  async getPdfLink(entryId: string) {
    return { url: `https://r2.local/${entryId}.pdf`, expiresInSeconds: 3600 };
  }

  async handleWebhook(dto: BoletoWebhookDto) {
    return {
      acknowledged: true,
      boletoId: dto.boletoId,
      entryId: dto.entryId,
      status: dto.status,
      paidAt: dto.paidAt ?? null,
      processedAt: new Date().toISOString(),
    };
  }
}
