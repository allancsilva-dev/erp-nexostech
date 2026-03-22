import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { CreateLockPeriodDto } from './dto/create-lock-period.dto';

@Injectable()
export class LockPeriodsRepository {
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

  async list(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, locked_until, reason, locked_by, created_at
      FROM ${schema}.lock_periods
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY locked_until DESC
    `),
    );

    return result.rows.map((row) => ({
      id: this.toText(row.id),
      branchId: this.toText(row.branch_id),
      lockedUntil: this.toText(row.locked_until),
      reason: this.toNullableText(row.reason),
      lockedBy: this.toText(row.locked_by),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    }));
  }

  async create(branchId: string, userId: string, dto: CreateLockPeriodDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const userLiteral = quoteLiteral(userId);
    const untilLiteral = quoteLiteral(dto.lockedUntil);
    const reasonLiteral = quoteLiteral(dto.reason ?? null);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.lock_periods (branch_id, locked_until, reason, locked_by)
      VALUES (${branchLiteral}, ${untilLiteral}, ${reasonLiteral}, ${userLiteral})
      RETURNING id, branch_id, locked_until, reason, locked_by, created_at
    `),
    );

    const row = result.rows[0];
    return {
      id: this.toText(row.id),
      branchId: this.toText(row.branch_id),
      lockedUntil: this.toText(row.locked_until),
      reason: this.toNullableText(row.reason),
      lockedBy: this.toText(row.locked_by),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    };
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.lock_periods
      SET deleted_at = NOW()
      WHERE id = ${quoteLiteral(id)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
    `),
    );
  }
}
