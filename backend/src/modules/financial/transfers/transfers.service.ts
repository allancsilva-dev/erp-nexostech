import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { TransferCreatedEvent } from '../../../common/events/financial.events';
import { BusinessException } from '../../../common/exceptions/business.exception';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransfersRepository } from './transfers.repository';

type DrizzleTransaction = Parameters<Parameters<DrizzleService['transaction']>[0]>[0];

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
    private readonly drizzleService: DrizzleService,
  ) {}

  private toDate(date: string | Date): Date {
    if (date instanceof Date) return new Date(date.getTime());
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(`${date}T00:00:00.000Z`);
    return new Date(date);
  }

  private async checkLockPeriod(
    branchId: string,
    dateToCheck: string | Date,
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
        SELECT locked_until
        FROM ${schema}.lock_periods
        WHERE branch_id = ${branchLiteral}
          AND deleted_at IS NULL
        ORDER BY locked_until DESC
        LIMIT 1
      `),
    );

    const row = result.rows[0] as { locked_until?: unknown } | undefined;
    if (!row?.locked_until) {
      return;
    }

    const latestLockedUntil =
      typeof row.locked_until === 'string'
        ? row.locked_until
        : String(row.locked_until as Date);

    const lockedUntil = this.toDate(latestLockedUntil);
    lockedUntil.setUTCHours(23, 59, 59, 999);

    const operationDate = this.toDate(dateToCheck);
    if (Number.isNaN(operationDate.getTime())) {
      throw new BusinessException('VALIDATION_ERROR', 400, {
        field: 'transferDate',
        message: 'Data inválida',
      });
    }

    if (operationDate <= lockedUntil) {
      throw new BusinessException('ENTRY_LOCKED_PERIOD', 422, {
        branchId,
        lockedUntil: lockedUntil.toISOString().slice(0, 10),
        operationDate:
          dateToCheck instanceof Date
            ? dateToCheck.toISOString().slice(0, 10)
            : dateToCheck,
      });
    }
  }

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
    const metadataJson = quoteLiteral(JSON.stringify(data.metadata ?? {}));

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
          ${metadataJson}::jsonb
        )
      `),
    );
  }

  async list(branchId: string, options?: { page?: number; pageSize?: number }) {
    return this.transfersRepository.list(branchId, options);
  }

  async create(branchId: string, dto: CreateTransferDto, user: AuthUser) {
    await this.checkLockPeriod(branchId, dto.transferDate);

    if (dto.fromAccountId === dto.toAccountId) {
      throw new BusinessException('TRANSFER_SAME_ACCOUNT', 400);
    }

    if (new Decimal(dto.amount).lte(0)) {
      throw new BusinessException('VALIDATION_AMOUNT', 400, {
        field: 'amount',
      });
    }

    const sourceAccount = await this.transfersRepository.findActiveBankAccount(
      dto.fromAccountId,
    );
    if (!sourceAccount || sourceAccount.branchId !== branchId) {
      throw new BusinessException(
        'TRANSFER_INVALID_ACCOUNT',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { field: 'fromAccountId' },
      );
    }

    const destinationAccount = await this.transfersRepository.findActiveBankAccount(
      dto.toAccountId,
    );
    if (!destinationAccount || destinationAccount.branchId !== branchId) {
      throw new BusinessException(
        'TRANSFER_INVALID_ACCOUNT',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { field: 'toAccountId' },
      );
    }

    const created = await this.txHelper.run(async (tx) => {
      const currentBalance =
        await this.transfersRepository.getAccountBalanceForUpdate(
          dto.fromAccountId,
          branchId,
          tx,
        );

      const available = new Decimal(currentBalance);
      const requested = new Decimal(dto.amount);

      if (available.lt(requested)) {
        throw new BusinessException(
          'PAYMENT_INSUFFICIENT_BALANCE',
          422,
          {
            accountId: dto.fromAccountId,
            available: available.toFixed(2),
            requested: requested.toFixed(2),
          },
        );
      }

      const transfer = await this.transfersRepository.create(branchId, dto, user.sub, tx);

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: user.email ?? 'system@local',
        action: 'CREATE',
        entity: 'financial_transfers',
        entityId: transfer.id,
        metadata: {
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: dto.amount,
          transferDate: dto.transferDate,
        },
      });

      return transfer;
    });

    this.eventBus.emit(
      'transfer.created',
      new TransferCreatedEvent(user.tenantId, branchId, created.id, dto.amount),
    );

    return created;
  }

  async softDelete(
    transferId: string,
    branchId: string,
    user: AuthUser,
  ): Promise<void> {
    const existing = await this.transfersRepository.findById(
      transferId,
      branchId,
    );
    if (!existing) {
      throw new BusinessException(
        'TRANSFER_NOT_FOUND',
        HttpStatus.NOT_FOUND,
        { transferId, branchId },
      );
    }

    await this.txHelper.run(async (tx) => {
      await this.transfersRepository.softDelete(transferId, branchId, tx);

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: user.email ?? 'system@local',
        action: 'DELETE',
        entity: 'financial_transfers',
        entityId: transferId,
      });
    });

    this.eventBus.emit('transfer.deleted', {
      tenantId: user.tenantId,
      branchId,
      transferId,
      deletedBy: user.sub,
    });
  }
}
