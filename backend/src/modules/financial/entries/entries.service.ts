import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import Decimal from 'decimal.js'; // import estático — não mais dinâmico com any
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { EventBusService } from '../../../infrastructure/events/event-bus.service';
import { TransactionHelper } from '../../../infrastructure/database/transaction.helper';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { AuthUser } from '../../../common/types/auth-user.type';
import { CreateEntryDto, EntryType } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryCalculator } from './domain/entry.calculator';
import { EntryRules } from './domain/entry.rules';
import {
  EntryRecord,
  EntriesListFilters,
  EntriesListOptions,
  EntriesRepository,
} from './entries.repository';
import { ApprovalRulesService } from '../approval-rules/approval-rules.service';
import { CategoriesService } from '../categories/categories.service';

type DrizzleTransaction = Parameters<Parameters<DrizzleService['transaction']>[0]>[0];

@Injectable()
export class EntriesService {
  private readonly entryRules = new EntryRules();
  private readonly entryCalculator = new EntryCalculator();

  constructor(
    private readonly entriesRepository: EntriesRepository,
    private readonly txHelper: TransactionHelper,
    private readonly eventBus: EventBusService,
    private readonly drizzleService: DrizzleService,
    private readonly approvalRulesService: ApprovalRulesService,
    private readonly categoriesService: CategoriesService,
  ) {}

  private toDate(date: string | Date): Date {
    if (date instanceof Date) return new Date(date.getTime());
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(`${date}T00:00:00`);
    return new Date(date);
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

  private async checkLockPeriod(branchId: string, dateToCheck: string | Date): Promise<void> {
    const latestLockedUntil = await this.getLatestLockedUntil(branchId);
    if (!latestLockedUntil) return;

    const lockedUntil = this.toDate(latestLockedUntil);
    lockedUntil.setHours(23, 59, 59, 999);

    const operationDate = this.toDate(dateToCheck);

    // Data inválida deve lançar erro, não passar silenciosamente
    if (Number.isNaN(operationDate.getTime())) {
      throw new BusinessException('VALIDATION_ERROR', 400, {
        field: 'date',
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

  private getAuditUserEmail(user: AuthUser): string {
    return user.email ?? 'system@local';
  }

  async list(branchId: string, filters: EntriesListFilters, options: EntriesListOptions) {
    return this.entriesRepository.list(branchId, filters, options);
  }

  async getById(entryId: string, branchId: string) {
    const entry = await this.entriesRepository.findById(entryId, branchId);
    if (!entry) {
      throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, { entryId, branchId });
    }
    return entry;
  }

  async create(dto: CreateEntryDto, user: AuthUser, branchId: string) {
    this.entryRules.validateCreate(dto, null);
    await this.checkLockPeriod(branchId, dto.issueDate);

    // Valida categoria antes de abrir transação
    const category = await this.categoriesService.findById(dto.categoryId, branchId);
    if (!category) {
      throw new BusinessException('CATEGORY_NOT_FOUND', HttpStatus.NOT_FOUND, {
        categoryId: dto.categoryId,
        branchId,
      });
    }

    const expectedCategoryType = dto.type === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
    if (category.type !== expectedCategoryType) {
      throw new BusinessException('ENTRY_CATEGORY_INCOMPATIBLE', 422, {
        categoryId: dto.categoryId,
        categoryType: category.type,
        entryType: dto.type,
      });
    }

    // Verifica regras de aprovação — erros propagam, não são suprimidos
    const needsApproval = dto.submit
      ? await this.checkApprovalRules(branchId, dto.type, dto.amount)
      : false;

    const initialStatus = !dto.submit ? 'DRAFT' : needsApproval ? 'PENDING_APPROVAL' : 'PENDING';

    // Calcula todas as parcelas — não só a primeira
    const installmentAmounts = dto.installment
      ? this.entryCalculator.calculateInstallments(dto.amount, dto.installmentCount ?? 1)
      : [dto.amount];

    const installmentTotal = dto.installment ? (dto.installmentCount ?? 1) : null;

    const created = await this.txHelper.run(async (tx) => {
      // Cria todas as parcelas dentro da mesma transação
      const entries: EntryRecord[] = [];
      for (let i = 0; i < installmentAmounts.length; i++) {
        const amount = installmentAmounts[i] ?? dto.amount;

        // Parcelas seguintes têm vencimento calculado a partir da primeira
        const dueDate = i === 0
          ? dto.dueDate
          : this.addMonths(dto.dueDate, i);

        // Cada parcela PENDING recebe seu próprio número; PENDING_APPROVAL permanece sem número.
        const partialDocNumber =
          initialStatus === 'PENDING'
            ? await this.generateDocumentNumber(branchId, dto.type, tx)
            : null;

        const entry = await this.entriesRepository.create(
          {
            branchId,
            documentNumber: partialDocNumber,
            type: dto.type,
            description: installmentTotal
              ? `${dto.description} (${i + 1}/${installmentTotal})`
              : dto.description,
            amount,
            issueDate: dto.issueDate,
            dueDate,
            status: initialStatus,
            categoryName: category.name, // nome real da categoria
            contactName: null,
            paidAmount: null,
            remainingBalance: amount,
            installmentNumber: installmentTotal ? i + 1 : null,
            installmentTotal,
            categoryId: dto.categoryId,
            contactId: dto.contactId ?? null,
          },
          tx,
        );

        entries.push(entry);
      }

      // audit_log dentro da transação — sem exceção
      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: this.getAuditUserEmail(user),
        action: 'CREATE',
        entity: 'financial_entries',
        entityId: entries[0]!.id,
        metadata: { installmentTotal, status: initialStatus },
      });

      return entries[0]!;
    });

    this.eventBus.emit('entry.created', {
      tenantId: user.tenantId,
      branchId,
      entryId: created.id,
      type: created.type,
    });

    if (created.status === 'PENDING_APPROVAL') {
      this.eventBus.emit('entry.pending_approval', {
        tenantId: user.tenantId,
        branchId,
        entryId: created.id,
        entryType: created.type,
        documentNumber: created.documentNumber,
        amount: created.amount,
        createdBy: user.sub,
      });
    }

    return created;
  }

  // Meses inteiros a partir de uma data ISO (YYYY-MM-DD)
  private addMonths(dateStr: string, months: number): string {
    const date = new Date(`${dateStr}T00:00:00`);
    const originalDay = date.getDate();

    date.setMonth(date.getMonth() + months);

    if (date.getDate() !== originalDay) {
      date.setDate(0);
    }

    return date.toISOString().slice(0, 10);
  }

  // Erros propagam — sem catch silencioso
  private async checkApprovalRules(
    branchId: string,
    entryType: string,
    amount: string,
  ): Promise<boolean> {
    const rules = await this.approvalRulesService.list(branchId);
    if (!rules || rules.length === 0) return false;

    const value = new Decimal(amount);
    for (const rule of rules) {
      if (!rule.active) continue;
      if (rule.entryType && rule.entryType !== entryType) continue;
      const min = new Decimal(rule.minAmount || '0');
      if (value.greaterThanOrEqualTo(min)) return true;
    }
    return false;
  }

  private async generateDocumentNumber(
    branchId: string,
    type: string,
    tx: DrizzleTransaction,
  ): Promise<string> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const year = new Date().getFullYear();
    const prefix = type === EntryType.PAYABLE ? 'PAY' : 'REC';

    const result: unknown = await tx.execute(
      sql.raw(`
        INSERT INTO ${schema}.document_sequences (branch_id, type, year, last_sequence)
        VALUES (${quoteLiteral(branchId)}, ${quoteLiteral(prefix)}, ${year}, 1)
        ON CONFLICT (branch_id, type, year)
        DO UPDATE SET
          last_sequence = ${schema}.document_sequences.last_sequence + 1,
          updated_at = NOW()
        RETURNING last_sequence
      `),
    );

    const rows = Array.isArray((result as any)?.rows) ? (result as any).rows : [];
    const nextSeq = Number(rows[0]?.last_sequence ?? 1);

    return `${prefix}-${year}-${String(nextSeq).padStart(5, '0')}`;
  }

  // audit_log dentro da transação — obrigatório em toda operação
  private async insertAuditLog(
    tx: DrizzleTransaction,
    data: {
      branchId: string;
      userId: string;
      userEmail: string;
      action: string;
      entity: string;
      entityId: string;
      fieldChanges?: Record<string, unknown>[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const fieldChangesJson = quoteLiteral(JSON.stringify(data.fieldChanges ?? []));
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
          ${fieldChangesJson}::jsonb,
          ${metadataJson}::jsonb
        )
      `),
    );
  }

  async update(entryId: string, dto: UpdateEntryDto, user: AuthUser, branchId: string) {
    const existing = await this.getById(entryId, branchId);
    await this.checkLockPeriod(branchId, existing.issueDate);

    const updated = await this.txHelper.run(async (tx) => {
      const result = await this.entriesRepository.update(entryId, branchId, dto);

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: this.getAuditUserEmail(user),
        action: 'UPDATE',
        entity: 'financial_entries',
        entityId: entryId,
        metadata: { updatedFields: Object.keys(dto) },
      });

      return result;
    });

    this.eventBus.emit('entry.updated', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      updatedBy: user.sub,
    });

    return updated;
  }

  async softDelete(entryId: string, user: AuthUser, branchId: string): Promise<void> {
    const entry = await this.getById(entryId, branchId);
    await this.checkLockPeriod(branchId, entry.issueDate);

    await this.txHelper.run(async (tx) => {
      await this.entriesRepository.softDelete(entryId, branchId);

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: this.getAuditUserEmail(user),
        action: 'DELETE',
        entity: 'financial_entries',
        entityId: entryId,
      });
    });

    this.eventBus.emit('entry.deleted', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      deletedBy: user.sub,
    });
  }

  async restore(entryId: string, user: AuthUser, branchId: string) {
    const deleted = await this.entriesRepository.findDeletedById(entryId, branchId);
    if (!deleted) {
      throw new BusinessException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND, { entryId, branchId });
    }

    await this.checkLockPeriod(branchId, deleted.issueDate);

    const restored = await this.txHelper.run(async (tx) => {
      const result = await this.entriesRepository.restore(entryId, branchId);

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: this.getAuditUserEmail(user),
        action: 'RESTORE',
        entity: 'financial_entries',
        entityId: entryId,
      });

      return result;
    });

    this.eventBus.emit('entry.restored', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      restoredBy: user.sub,
    });

    return restored;
  }

  assertNotPendingApproval(entry: { id: string; status: string }): void {
    if (entry.status === 'PENDING_APPROVAL') {
      throw new BusinessException('ENTRY_APPROVAL_REQUIRED', undefined, {
        entryId: entry.id,
        status: entry.status,
      });
    }
  }

  async cancel(entryId: string, reason: string | undefined, user: AuthUser, branchId: string) {
    const entry = await this.getById(entryId, branchId);
    await this.checkLockPeriod(branchId, entry.issueDate);

    // reason obrigatório — undefined não é aceitável
    if (!reason || reason.trim().length < 10) {
      throw new BusinessException('VALIDATION_ERROR', 400, {
        field: 'reason',
        minLength: 10,
      });
    }

    if (entry.status === 'CANCELLED') return entry;

    // PAID e PARTIAL não podem ser cancelados — devem ser estornados
    if (entry.status === 'PAID' || entry.status === 'PARTIAL') {
      throw new BusinessException('ENTRY_INVALID_STATUS_CANCEL', 422, {
        entryId,
        status: entry.status,
      });
    }

    const cancelled = await this.txHelper.run(async (tx) => {
      const result = await this.entriesRepository.cancel(entryId, branchId);

      await this.insertAuditLog(tx, {
        branchId,
        userId: user.sub,
        userEmail: this.getAuditUserEmail(user),
        action: 'CANCEL',
        entity: 'financial_entries',
        entityId: entryId,
        metadata: { reason },
      });

      return result;
    });

    this.eventBus.emit('entry.cancelled', {
      tenantId: user.tenantId,
      branchId,
      entryId,
      cancelledBy: user.sub,
      reason,
    });

    return cancelled;
  }
}