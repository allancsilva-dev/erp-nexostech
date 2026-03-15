import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { ReconciliationRepository } from './reconciliation.repository';
import { ImportReconciliationDto } from './dto/import-reconciliation.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly reconciliationRepository: ReconciliationRepository,
    private readonly txHelper: TransactionHelper,
  ) {}

  async listPending(branchId: string) {
    return this.reconciliationRepository.listPending(branchId);
  }

  async importBatch(branchId: string, user: AuthUser, dto: ImportReconciliationDto) {
    return this.txHelper.run(async () => {
      const batch = await this.reconciliationRepository.createBatch(
        dto.branchIdOverride ?? branchId,
        user.sub,
        dto.bankAccountId,
        dto.startDate,
        dto.endDate,
      );

      const importedCount = await this.reconciliationRepository.importFromPayments(
        batch.id,
        batch.branchId,
        batch.bankAccountId,
        batch.startDate,
        batch.endDate,
      );

      return {
        ...batch,
        importedCount,
      };
    });
  }

  async undo(batchId: string, branchId: string) {
    await this.txHelper.run(async () => {
      await this.reconciliationRepository.undoBatch(batchId, branchId);
    });
  }
}
