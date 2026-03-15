import { BoletosService } from './boletos.service';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletosRepository } from './boletos.repository';

describe('BoletosService', () => {
  it('acknowledges webhook and persists status update', async () => {
    const gateway = {} as BoletosGatewayClient;

    const repository: jest.Mocked<BoletosRepository> = {
      listByBranch: jest.fn(),
      findByEntryId: jest.fn(),
      upsertGenerated: jest.fn(),
      markCancelled: jest.fn(),
      markWebhookStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BoletosRepository>;

    const service = new BoletosService(gateway, repository);

    const result = await service.handleWebhook({
      boletoId: 'bol_1',
      entryId: 'entry_1',
      status: 'PAID',
      paidAt: '2026-03-14T12:00:00.000Z',
    });

    expect(repository.markWebhookStatus).toHaveBeenCalledWith(
      'entry_1',
      'PAID',
      '2026-03-14T12:00:00.000Z',
    );
    expect(result.acknowledged).toBe(true);
  });
});
