import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { OutboxService } from '../../../infrastructure/outbox/outbox.service';
import { ImportReconciliationDto } from './dto/import-reconciliation.dto';
import { ReconciliationRepository } from './reconciliation.repository';

type DrizzleTransaction = Parameters<
  Parameters<DrizzleService['transaction']>[0]
>[0];

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly reconciliationRepository: ReconciliationRepository,
    private readonly txHelper: TransactionHelper,
    private readonly outboxService: OutboxService,
    private readonly drizzleService: DrizzleService,
  ) {}

  private async insertAuditLog(
    tx: DrizzleTransaction,
    data: {
      branchId: string;
      userId: string;
      userEmail: string;
      action: string;
      entity: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await tx.execute(
      sql.raw(`
        INSERT INTO ${schema}.audit_logs (
          branch_id, user_id, user_email, action, entity, entity_id, field_changes, metadata
        ) VALUES (
          ${quoteLiteral(data.branchId)},
          ${quoteLiteral(data.userId)},
          ${quoteLiteral(data.userEmail)},
          ${quoteLiteral(data.action)},
          ${quoteLiteral(data.entity)},
          ${quoteLiteral(data.entityId)},
          '[]'::jsonb,
          ${quoteLiteral(JSON.stringify(data.metadata ?? {}))}::jsonb
        )
      `),
    );
  }

  async listPending(branchId: string) {
    return this.reconciliationRepository.listPending(branchId);
  }

  async importBatch(
    branchId: string,
    user: AuthUser,
    dto: ImportReconciliationDto,
  ) {
    const account = await this.reconciliationRepository.findActiveBankAccount(
      dto.bankAccountId,
      branchId,
    );
    if (!account) {
      throw new BusinessException(
        'BANK_ACCOUNT_NOT_FOUND',
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          bankAccountId: dto.bankAccountId,
          branchId,
        },
      );
    }

    return this.txHelper.run(async (tx) => {
      const batch = await this.reconciliationRepository.createBatch(
        branchId,
        user.sub,
        dto.bankAccountId,
        dto.startDate,
        dto.endDate,
        tx,
      );

      const importedCount =
        await this.reconciliationRepository.importFromPayments(
          batch.id,
          branchId,
          dto.bankAccountId,
          dto.startDate,
          dto.endDate,
          tx,
        );

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: user.email ?? 'system@local',
        action: 'RECONCILE',
        entity: 'reconciliation_batches',
        entityId: batch.id,
        metadata: {
          bankAccountId: dto.bankAccountId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          importedCount,
        },
      });

      return {
        ...batch,
        importedCount,
      };
    });
  }

  async undo(batchId: string, branchId: string) {
    await this.txHelper.run(async (tx) => {
      await this.reconciliationRepository.undoBatch(batchId, branchId, tx);
    });
  }

  async getBatchItems(batchId: string, branchId: string) {
    return this.reconciliationRepository.getBatchItems(batchId, branchId);
  }

  async match(
    itemId: string,
    entryId: string | undefined,
    branchId: string,
    user: AuthUser,
  ) {
    const item = await this.reconciliationRepository.findItemById(
      itemId,
      branchId,
    );
    if (!item) {
      throw new BusinessException('NOT_FOUND', HttpStatus.NOT_FOUND, {
        itemId,
        branchId,
      });
    }

    if (item.reconciled) {
      throw new BusinessException(
        'RECONCILIATION_ITEM_ALREADY_MATCHED',
        HttpStatus.CONFLICT,
        {
          itemId,
        },
      );
    }

    if (entryId) {
      const entryBelongs =
        await this.reconciliationRepository.entryBelongsToBranch(
          entryId,
          branchId,
        );
      if (!entryBelongs) {
        throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, {
          entryId,
          branchId,
        });
      }
    }

    const matched = await this.txHelper.run(async (tx) => {
      const result = await this.reconciliationRepository.matchItem(
        itemId,
        entryId,
        branchId,
        tx,
      );

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: user.email ?? 'system@local',
        action: 'RECONCILE',
        entity: 'reconciliation_items',
        entityId: itemId,
        metadata: { entryId: entryId ?? null },
      });

      await this.outboxService.insert(
        tx,
        user.tenantId,
        'reconciliation.matched',
        {
          branchId,
          itemId,
          entryId: result.entryId,
          matchedBy: user.sub,
        },
      );

      return result;
    });

    return matched;
  }
}
