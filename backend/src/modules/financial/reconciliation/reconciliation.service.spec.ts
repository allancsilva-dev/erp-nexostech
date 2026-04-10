import { ReconciliationService } from './reconciliation.service';
import { ReconciliationRepository } from './reconciliation.repository';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { ImportReconciliationDto } from './dto/import-reconciliation.dto';

describe('ReconciliationService', () => {
  it('imports batch and returns imported count', async () => {
    const createBatchMock = jest.fn().mockResolvedValue({
      id: 'batch-1',
      branchId: 'branch-1',
      bankAccountId: 'acc-1',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      createdBy: 'user-1',
      createdAt: '2026-03-14T00:00:00.000Z',
    });
    const importFromPaymentsMock = jest.fn().mockResolvedValue(7);
    const repository: jest.Mocked<ReconciliationRepository> = {
      listPending: jest.fn(),
      findActiveBankAccount: jest.fn().mockResolvedValue({
        id: 'acc-1',
        branchId: 'branch-1',
      }),
      createBatch: createBatchMock,
      importFromPayments: importFromPaymentsMock,
      undoBatch: jest.fn(),
      getBatchItems: jest.fn(),
      matchItem: jest.fn(),
    } as unknown as jest.Mocked<ReconciliationRepository>;

    const tx = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    const txHelper = {
      run: jest.fn(async (cb: (currentTx: typeof tx) => Promise<unknown>) =>
        cb(tx),
      ),
    } as unknown as TransactionHelper;

    const outboxService = {
      insert: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxService;
    const drizzleService = {
      getTenantSchema: jest.fn().mockReturnValue('tenant_test'),
    } as unknown as DrizzleService;

    const service = new ReconciliationService(
      repository,
      txHelper,
      outboxService,
      drizzleService,
    );

    const dto: ImportReconciliationDto = {
      bankAccountId: 'acc-1',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    };

    const user = {
      sub: 'user-1',
      tenantId: 'tenant-1',
      roles: ['ADMIN'],
      plan: 'PRO',
      aud: 'erp.zonadev.tech',
    };

    const result = await service.importBatch('branch-1', user, dto);

    expect(createBatchMock).toHaveBeenCalled();
    expect(importFromPaymentsMock).toHaveBeenCalledWith(
      'batch-1',
      'branch-1',
      'acc-1',
      '2026-03-01',
      '2026-03-31',
      tx,
    );
    expect(result.importedCount).toBe(7);
  });
});
