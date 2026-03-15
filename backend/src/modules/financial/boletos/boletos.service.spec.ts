import { BoletosService } from './boletos.service';
import { BoletosGatewayClient } from './boletos.gateway-client';
import { BoletosRepository } from './boletos.repository';
import { StorageService } from '../../../infrastructure/storage/storage.service';

describe('BoletosService', () => {
  it('acknowledges webhook and persists status update', async () => {
    const gateway = {} as BoletosGatewayClient;
    const storage = {
      getPublicUrl: jest
        .fn()
        .mockReturnValue('https://r2.local/boletos/entry_1.pdf'),
    } as unknown as StorageService;

    const repository: jest.Mocked<BoletosRepository> = {
      listByBranch: jest.fn(),
      findByEntryId: jest.fn(),
      upsertGenerated: jest.fn(),
      markCancelled: jest.fn(),
      markWebhookStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<BoletosRepository>;

    const service = new BoletosService(gateway, repository, storage);

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

  it('uses storage public url fallback when boleto has no persisted pdf', async () => {
    const gateway = {} as BoletosGatewayClient;
    const storage = {
      getPublicUrl: jest
        .fn()
        .mockReturnValue('https://r2.local/boletos/entry_2.pdf'),
    } as unknown as StorageService;

    const repository: jest.Mocked<BoletosRepository> = {
      listByBranch: jest.fn(),
      findByEntryId: jest.fn().mockResolvedValue(null),
      upsertGenerated: jest.fn(),
      markCancelled: jest.fn(),
      markWebhookStatus: jest.fn(),
    } as unknown as jest.Mocked<BoletosRepository>;

    const service = new BoletosService(gateway, repository, storage);
    const result = await service.getPdfLink('entry_2', 'branch_1');

    expect(storage.getPublicUrl).toHaveBeenCalledWith('boletos/entry_2.pdf');
    expect(result.url).toBe('https://r2.local/boletos/entry_2.pdf');
  });
});
