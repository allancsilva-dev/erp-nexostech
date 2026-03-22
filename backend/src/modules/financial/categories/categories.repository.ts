import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './dto/category.response';

@Injectable()
export class CategoriesRepository {
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

  private mapRow(row: Record<string, unknown>): CategoryEntity {
    return {
      id: this.toText(row.id),
      branchId: this.toText(row.branch_id),
      name: this.toText(row.name),
      type: this.toText(row.type),
      parentId: this.toNullableText(row.parent_id),
      color: this.toNullableText(row.color),
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
      createdAt: new Date(this.toText(row.created_at)).toISOString(),
    };
  }

  async list(branchId: string): Promise<CategoryEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branch = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, name, type, parent_id, color, active, sort_order, created_at
      FROM ${schema}.categories
      WHERE branch_id = ${branch}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC, created_at ASC
    `),
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async findById(id: string, branchId: string): Promise<CategoryEntity | null> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, name, type, parent_id, color, active, sort_order, created_at
      FROM ${schema}.categories
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async create(
    branchId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branch = quoteLiteral(branchId);
    const name = quoteLiteral(dto.name);
    const type = quoteLiteral(dto.type);
    const parentId = quoteLiteral(dto.parentId ?? null);
    const color = quoteLiteral(dto.color ?? null);
    const sortOrder = quoteLiteral(dto.sortOrder ?? 0);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.categories (
        branch_id, name, type, parent_id, color, active, sort_order
      ) VALUES (
        ${branch}, ${name}, ${type}, ${parentId}, ${color}, true, ${sortOrder}
      )
      RETURNING id, branch_id, name, type, parent_id, color, active, sort_order, created_at
    `),
    );

    const row = result.rows[0];
    return this.mapRow(row);
  }

  async update(
    id: string,
    branchId: string,
    dto: {
      name?: string;
      type?: string;
      parentId?: string;
      color?: string;
      sortOrder?: number;
    },
  ): Promise<CategoryEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);
    const sets: string[] = [];

    if (dto.name !== undefined) sets.push(`name = ${quoteLiteral(dto.name)}`);
    if (dto.type !== undefined) sets.push(`type = ${quoteLiteral(dto.type)}`);
    if (dto.parentId !== undefined)
      sets.push(`parent_id = ${quoteLiteral(dto.parentId)}`);
    if (dto.color !== undefined)
      sets.push(`color = ${quoteLiteral(dto.color)}`);
    if (dto.sortOrder !== undefined)
      sets.push(`sort_order = ${quoteLiteral(dto.sortOrder)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.categories
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND branch_id = ${branchLiteral}
          AND deleted_at IS NULL
      `),
      );
    }

    const updated = await this.findById(id, branchId);
    if (!updated) {
      throw new Error('Updated category could not be reloaded');
    }

    return updated;
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(
      sql.raw(`
      UPDATE ${schema}.categories
      SET deleted_at = NOW(), active = false
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `),
    );
  }
}
