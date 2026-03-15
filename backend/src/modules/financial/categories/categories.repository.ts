import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryEntity } from './dto/category.response';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(branchId: string): Promise<CategoryEntity[]> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branch = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, branch_id, name, type, parent_id, color, active, sort_order, created_at
      FROM ${schema}.categories
      WHERE branch_id = ${branch}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC, created_at ASC
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      branchId: String(row.branch_id),
      name: String(row.name),
      type: String(row.type),
      parentId: row.parent_id ? String(row.parent_id) : null,
      color: row.color ? String(row.color) : null,
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }

  async create(branchId: string, dto: CreateCategoryDto): Promise<CategoryEntity> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branch = quoteLiteral(branchId);
    const name = quoteLiteral(dto.name);
    const type = quoteLiteral(dto.type);
    const parentId = quoteLiteral(dto.parentId ?? null);
    const color = quoteLiteral(dto.color ?? null);
    const sortOrder = quoteLiteral(dto.sortOrder ?? 0);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.categories (
        branch_id, name, type, parent_id, color, active, sort_order
      ) VALUES (
        ${branch}, ${name}, ${type}, ${parentId}, ${color}, true, ${sortOrder}
      )
      RETURNING id, branch_id, name, type, parent_id, color, active, sort_order, created_at
    `));

    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      name: String(row.name),
      type: String(row.type),
      parentId: row.parent_id ? String(row.parent_id) : null,
      color: row.color ? String(row.color) : null,
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }
}
