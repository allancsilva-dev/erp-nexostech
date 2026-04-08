import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { RegisterPaymentDto } from './dto/register-payment.dto';

describe('PaymentsService', () => {
  it('uses persisted payment amounts to determine status (no double count)', async () => {
    const listPaymentAmountsMock = jest.fn().mockResolvedValue(['100.00']);
    const updateEntryPaidStatusMock = jest.fn().mockResolvedValue(undefined);
    const tx = {};
    const repository: jest.Mocked<PaymentsRepository> = {
      findEntryById: jest.fn().mockResolvedValue({
        id: 'entry-1',
        amount: '100.00',
        status: 'PENDING',
        type: 'PAYABLE',
        branchId: 'branch-1',
        remainingBalance: '100.00',
        lastPaymentDate: '2026-03-14',
      }),
      createPayment: jest.fn().mockResolvedValue({
        id: 'p1',
        entryId: 'entry-1',
        amount: '100.00',
        paymentDate: '2026-03-14',
        paymentMethod: null,
        bankAccountId: null,
        notes: null,
        createdBy: 'u1',
        createdAt: '2026-03-14T00:00:00.000Z',
      }),
      listPaymentAmounts: listPaymentAmountsMock,
      updateEntryPaidStatus: updateEntryPaidStatusMock,
      findEntryByIdForUpdate: jest.fn().mockResolvedValue({
        id: 'entry-1',
        amount: '100.00',
        status: 'PENDING',
        type: 'PAYABLE',
        branchId: 'branch-1',
        remainingBalance: '100.00',
        lastPaymentDate: '2026-03-14',
      }),
      findPaymentById: jest.fn(),
      removePaymentById: jest.fn(),
      listByEntry: jest.fn(),
    } as unknown as jest.Mocked<PaymentsRepository>;

    const txHelper = {
      run: jest.fn(async (cb: (currentTx: typeof tx) => Promise<unknown>) => cb(tx)),
    } as unknown as TransactionHelper;

    const eventBus = {
      emit: jest.fn(),
    } as unknown as EventBusService;

    const drizzleService = {} as DrizzleService;
    const outboxService = {
      insert: jest.fn().mockResolvedValue(undefined),
    } as unknown as OutboxService;

    const service = new PaymentsService(
      repository,
      txHelper,
      eventBus,
      outboxService,
      drizzleService,
    );

    const dto: RegisterPaymentDto = {
      amount: '100.00',
      paymentDate: '2026-03-14',
    };

    const user = {
      sub: 'u1',
      tenantId: 't1',
      roles: ['ADMIN'],
      plan: 'PRO',
      aud: 'erp.zonadev.tech',
    };

    await service.registerPayment('entry-1', dto, user, 'branch-1');

    expect(listPaymentAmountsMock).toHaveBeenCalledWith('entry-1', tx);
    expect(updateEntryPaidStatusMock).toHaveBeenCalledWith('entry-1', 'PAID', tx);
  });
});
