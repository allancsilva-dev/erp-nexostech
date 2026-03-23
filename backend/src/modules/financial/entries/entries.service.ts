import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { AuthUser } from '../../../common/types/auth-user.type';
import { CreateEntryDto, EntryType } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryCalculator } from './domain/entry.calculator';
import { EntryRules } from './domain/entry.rules';
import { EntriesRepository } from './entries.repository';

@Injectable()
export class EntriesService {
  private readonly entryRules = new EntryRules();
  private readonly entryCalculator = new EntryCalculator();

  constructor(
    private readonly entriesRepository: EntriesRepository,
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
    return typeof row?.locked_until === 'string'
      ? row.locked_until
      : row?.locked_until
        ? String(row.locked_until)
        : null;
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
    return this.entriesRepository.list(branchId);
  }

  async getById(entryId: string, branchId: string) {
    const entry = await this.entriesRepository.findById(entryId, branchId);
    if (!entry) {
      throw new BusinessException(
        'ENTRY_NOT_FOUND',
        'Lancamento nao encontrado para a filial informada',
        { entryId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    return entry;
  }

  async create(dto: CreateEntryDto, user: AuthUser, branchId: string) {
    this.entryRules.validateCreate(dto, null);
    await this.checkLockPeriod(branchId, dto.issueDate);

    const installments = dto.installment
      ? this.entryCalculator.calculateInstallments(
          dto.amount,
          dto.installmentCount ?? 1,
        )
      : [dto.amount];

    const created = await this.txHelper.run(async () => {
      const firstInstallmentAmount = installments[0] ?? dto.amount;
      return this.entriesRepository.create({
        branchId,
        documentNumber: `${dto.type === EntryType.PAYABLE ? 'PAY' : 'REC'}-${new Date().getFullYear()}-00001`,
        type: dto.type,
        description: dto.description,
        amount: firstInstallmentAmount,
        issueDate: dto.issueDate,
        dueDate: dto.dueDate,
        status: 'DRAFT',
        categoryName: 'Categoria provisoria',
        contactName: null,
        paidAmount: null,
        remainingBalance: firstInstallmentAmount,
        installmentNumber: dto.installment ? 1 : null,
        installmentTotal: dto.installment
          ? (dto.installmentCount ?? null)
          : null,
        categoryId: dto.categoryId,
        contactId: dto.contactId ?? null,
      });
    });

    this.eventBus.emit('entry.created', {
      tenantId: user.tenantId,
      branchId,
      entryId: created.id,
      type: created.type,
    });

    return created;
  }

  async update(
    entryId: string,
    dto: UpdateEntryDto,
    user: AuthUser,
    branchId: string,
  ) {
    const existing = await this.getById(entryId, branchId);
    await this.checkLockPeriod(branchId, existing.issueDate);

    const updated = await this.txHelper.run(async () => {
      return this.entriesRepository.update(entryId, branchId, dto);
    });

    this.eventBus.emit('entry.updated', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      updatedBy: user.sub,
    });

    return updated;
  }

  async softDelete(
    entryId: string,
    user: AuthUser,
    branchId: string,
  ): Promise<void> {
    await this.getById(entryId, branchId);

    await this.txHelper.run(async () => {
      await this.entriesRepository.softDelete(entryId, branchId);
    });

    this.eventBus.emit('entry.deleted', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      deletedBy: user.sub,
    });
  }

  async restore(entryId: string, user: AuthUser, branchId: string) {
    const deleted = await this.entriesRepository.findDeletedById(
      entryId,
      branchId,
    );
    if (!deleted) {
      throw new BusinessException(
        'ENTRY_NOT_FOUND',
        'Lancamento excluido nao encontrado para restauracao',
        { entryId, branchId },
        HttpStatus.NOT_FOUND,
      );
    }

    const restored = await this.txHelper.run(async () => {
      return this.entriesRepository.restore(entryId, branchId);
    });

    this.eventBus.emit('entry.restored', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      restoredBy: user.sub,
    });

    return restored;
  }

  /**
   * Valida que a entry não está em status PENDING_APPROVAL.
   * Deve ser chamado antes de qualquer operação que exija status ativo.
   */
  assertNotPendingApproval(entry: { id: string; status: string }): void {
    if (entry.status === 'PENDING_APPROVAL') {
      throw new BusinessException(
        'APPROVAL_REQUIRED',
        'Este lancamento esta aguardando aprovacao e nao pode ser operado diretamente',
        { entryId: entry.id, status: entry.status },
      );
    }
  }

  async cancel(
    entryId: string,
    reason: string | undefined,
    user: AuthUser,
    branchId: string,
  ) {
    const entry = await this.getById(entryId, branchId);
    await this.checkLockPeriod(branchId, entry.issueDate);

    if (entry.status === 'CANCELLED') {
      return entry;
    }

    const cancelled = await this.txHelper.run(async () => {
      return this.entriesRepository.cancel(entryId, branchId);
    });

    this.eventBus.emit('entry.cancelled', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      cancelledBy: user.sub,
      reason: reason ?? null,
    });

    return cancelled;
  }
}
