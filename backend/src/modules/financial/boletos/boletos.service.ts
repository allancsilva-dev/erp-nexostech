import { Injectable } from '@nestjs/common';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletosRepository } from './boletos.repository';
import { BoletoWebhookDto } from './dto/boleto-webhook.dto';
import { GenerateBoletoDto } from './dto/generate-boleto.dto';

@Injectable()
export class BoletosService {
  constructor(
    private readonly gatewayClient: BoletosGatewayClient,
    private readonly boletosRepository: BoletosRepository,
  ) {}

  async list(branchId: string) {
    return this.boletosRepository.listByBranch(branchId);
  }

  async generate(entryId: string, branchId: string, dto: GenerateBoletoDto) {
    const gateway = await this.gatewayClient.generate({
      entryId,
      amount: dto.amount,
      dueDate: dto.dueDate,
    });

    return this.boletosRepository.upsertGenerated(
      entryId,
      branchId,
      dto.amount,
      dto.dueDate,
      gateway.boletoId,
      gateway.status,
      gateway.pdfUrl,
    );
  }

  async cancel(entryId: string, branchId: string) {
    const boleto = await this.boletosRepository.findByEntryId(entryId, branchId);
    const gatewayId = boleto?.gatewayBoletoId ?? `bol_${entryId}`;
    const gatewayResult = await this.gatewayClient.cancel(gatewayId);
    await this.boletosRepository.markCancelled(entryId, branchId);
    return gatewayResult;
  }

  async getPdfLink(entryId: string, branchId: string) {
    const boleto = await this.boletosRepository.findByEntryId(entryId, branchId);
    return {
      url: boleto?.pdfUrl ?? `https://r2.local/${entryId}.pdf`,
      expiresInSeconds: 3600,
    };
  }

  async handleWebhook(dto: BoletoWebhookDto) {
    await this.boletosRepository.markWebhookStatus(dto.entryId, dto.status, dto.paidAt);
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
