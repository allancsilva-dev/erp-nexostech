import { Injectable } from '@nestjs/common';
import { BoletosGatewayClient } from './boletos.gateway-client';
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
}
