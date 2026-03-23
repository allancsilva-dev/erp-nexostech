import { Injectable, UnprocessableEntityException } from '@nestjs/common';
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

@Injectable()
export class TransfersService {
  constructor(
    private readonly transfersRepository: TransfersRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
    private readonly drizzleService: DrizzleService,
  ) {}

  private toDate(date: string | Date): Date {
    if (date instanceof Date) {
      return new Date(date.getTime());
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T00:00:00`);
    }

    return new Date(date);
  }

  private formatDateBr(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private async getLatestLockedUntil(branchId: string): Promise<string | null> {
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
    if (!row?.locked_until) return null;
    if (typeof row.locked_until === 'string') return row.locked_until;
    return String(row.locked_until as Date);
  }

  private async checkLockPeriod(
    branchId: string,
    dateToCheck: string | Date,
  ): Promise<void> {
    const latestLockedUntil = await this.getLatestLockedUntil(branchId);

    if (!latestLockedUntil) {
      return;
    }

    const lockedUntil = this.toDate(latestLockedUntil);
    lockedUntil.setHours(23, 59, 59, 999);

    const operationDate = this.toDate(dateToCheck);
    if (Number.isNaN(operationDate.getTime())) {
      return;
    }

    if (operationDate <= lockedUntil) {
      throw new UnprocessableEntityException(
        `Data bloqueada pelo fechamento contabil de ${this.formatDateBr(lockedUntil)} para branch ${branchId}.`,
      );
    }
  }

  async list(branchId: string) {
    return this.transfersRepository.list(branchId);
  }

  async create(branchId: string, dto: CreateTransferDto, user: AuthUser) {
    await this.checkLockPeriod(branchId, dto.transferDate);

    if (dto.fromAccountId === dto.toAccountId) {
      throw new BusinessException(
        'VALIDATION_ERROR',
        'Conta origem e destino devem ser diferentes',
        undefined,
        400,
      );
    }

    if (new Decimal(dto.amount).lte(0)) {
      throw new BusinessException(
        'VALIDATION_ERROR',
        'Valor da transferencia deve ser positivo',
        undefined,
        400,
      );
    }

    const created = await this.txHelper.run(async () => {
      return this.transfersRepository.create(branchId, dto, user.sub);
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
        'Transferencia nao encontrada para a filial informada',
        { transferId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.txHelper.run(async () => {
      await this.transfersRepository.softDelete(transferId, branchId);
    });

    this.eventBus.emit('transfer.deleted', {
      tenantId: user.tenantId,
      branchId,
      transferId,
      deletedBy: user.sub,
    });
  }
}
