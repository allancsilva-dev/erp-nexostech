import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { CreateApprovalRuleDto } from './dto/create-approval-rule.dto';
import { UpdateApprovalRuleDto } from './dto/update-approval-rule.dto';

@Injectable()
export class ApprovalRulesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private toText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return '';
  }

  private toNullableText(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
    return null;
  }

  private mapRow(row: Record<string, unknown>) {
    return {
      id: this.toText(row.id),
      branchId: this.toText(row.branch_id),
      entryType: this.toNullableText(row.entry_type),
      minAmount: this.toText(row.min_amount),
      approverRoleId: this.toText(row.approver_role_id),
      active: Boolean(row.active),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    };
  }

  async list(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, entry_type, min_amount, approver_role_id, active, created_at
      FROM ${schema}.approval_rules
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY min_amount ASC, created_at ASC
    `),
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async create(branchId: string, dto: CreateApprovalRuleDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const entryTypeLiteral = quoteLiteral(dto.entryType ?? null);
    const minAmountLiteral = quoteLiteral(dto.minAmount);
    const approverRoleIdLiteral = quoteLiteral(dto.approverRoleId);
    const activeLiteral = quoteLiteral(dto.active);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.approval_rules (
        branch_id, entry_type, min_amount, approver_role_id, active
      ) VALUES (
        ${branchLiteral}, ${entryTypeLiteral}, ${minAmountLiteral}, ${approverRoleIdLiteral}, ${activeLiteral}
      )
      RETURNING id, branch_id, entry_type, min_amount, approver_role_id, active, created_at
    `),
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string, branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, entry_type, min_amount, approver_role_id, active, created_at
      FROM ${schema}.approval_rules
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, branchId: string, dto: UpdateApprovalRuleDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);
    const sets: string[] = [];

    if (dto.entryType !== undefined)
      sets.push(`entry_type = ${quoteLiteral(dto.entryType)}`);
    if (dto.minAmount !== undefined)
      sets.push(`min_amount = ${quoteLiteral(dto.minAmount)}`);
    if (dto.approverRoleId !== undefined)
      sets.push(`approver_role_id = ${quoteLiteral(dto.approverRoleId)}`);
    if (dto.active !== undefined)
      sets.push(`active = ${quoteLiteral(dto.active)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.approval_rules
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND branch_id = ${branchLiteral}
          AND deleted_at IS NULL
      `),
      );
    }

    const updated = await this.findById(id, branchId);
    if (!updated) {
      // TODO: mover esta regra de negocio para a camada de service (refactor futuro)
      throw new BusinessException(
        'INTERNAL_ERROR',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { id, branchId, operation: 'RELOAD_APPROVAL_RULE' },
      );
    }

    return updated;
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.approval_rules
      SET deleted_at = NOW(), active = false
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `),
    );
  }
}
