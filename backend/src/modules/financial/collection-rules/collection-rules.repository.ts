import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../../infrastructure/database/sql-builder.util';
import { CreateCollectionRuleDto } from './dto/create-collection-rule.dto';
import { UpdateCollectionRuleDto } from './dto/update-collection-rule.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class CollectionRulesRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  private mapRow(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      event: String(row.event),
      daysOffset: Number(row.days_offset),
      emailTemplateId: String(row.email_template_id),
      active: Boolean(row.active),
      sortOrder: Number(row.sort_order),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async list(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, branch_id, event, days_offset, email_template_id, active, sort_order, created_at
      FROM ${schema}.collection_rules
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC, created_at ASC
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => this.mapRow(row));
  }

  async create(branchId: string, dto: CreateCollectionRuleDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const eventLiteral = quoteLiteral(dto.event);
    const daysOffsetLiteral = quoteLiteral(dto.daysOffset);
    const emailTemplateIdLiteral = quoteLiteral(dto.emailTemplateId);
    const activeLiteral = quoteLiteral(dto.active);
    const sortOrderLiteral = quoteLiteral(dto.sortOrder);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.collection_rules (
        branch_id, event, days_offset, email_template_id, active, sort_order
      ) VALUES (
        ${branchLiteral}, ${eventLiteral}, ${daysOffsetLiteral}, ${emailTemplateIdLiteral}, ${activeLiteral}, ${sortOrderLiteral}
      )
      RETURNING id, branch_id, event, days_offset, email_template_id, active, sort_order, created_at
    `));

    return this.mapRow(result.rows[0] as Record<string, unknown>);
  }

  async findById(id: string, branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, branch_id, event, days_offset, email_template_id, active, sort_order, created_at
      FROM ${schema}.collection_rules
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `));

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, branchId: string, dto: UpdateCollectionRuleDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);
    const sets: string[] = [];

    if (dto.event !== undefined) sets.push(`event = ${quoteLiteral(dto.event)}`);
    if (dto.daysOffset !== undefined) sets.push(`days_offset = ${quoteLiteral(dto.daysOffset)}`);
    if (dto.emailTemplateId !== undefined) {
      sets.push(`email_template_id = ${quoteLiteral(dto.emailTemplateId)}`);
    }
    if (dto.active !== undefined) sets.push(`active = ${quoteLiteral(dto.active)}`);
    if (dto.sortOrder !== undefined) sets.push(`sort_order = ${quoteLiteral(dto.sortOrder)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(sql.raw(`
        UPDATE ${schema}.collection_rules
        SET ${sets.join(', ')}
        WHERE id = ${idLiteral}
          AND branch_id = ${branchLiteral}
          AND deleted_at IS NULL
      `));
    }

    const updated = await this.findById(id, branchId);
    if (!updated) {
      throw new Error('Updated collection rule could not be reloaded');
    }

    return updated;
  }

  async softDelete(id: string, branchId: string): Promise<void> {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);

    await this.drizzleService.getClient().execute(sql.raw(`
      UPDATE ${schema}.collection_rules
      SET deleted_at = NOW(), active = false
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `));
  }

  async listEmailTemplates(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT DISTINCT email_template_id
      FROM ${schema}.collection_rules
      WHERE branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      ORDER BY email_template_id
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => {
      const templateId = String(row.email_template_id);
      return {
        id: templateId,
        branchId,
        name: `Template ${templateId.slice(0, 8)}`,
        subject: 'Aviso financeiro Nexos ERP',
        bodyHtml: '<p>Prezado(a) {{nome_cliente}}, valor {{valor}} com vencimento {{vencimento}}.</p>',
        bodyText: 'Prezado(a) {{nome_cliente}}, valor {{valor}} com vencimento {{vencimento}}.',
      };
    });
  }

  async updateEmailTemplate(id: string, branchId: string, dto: UpdateEmailTemplateDto) {
    const templates = await this.listEmailTemplates(branchId);
    const existing = templates.find((template) => template.id === id);
    if (!existing) {
      return null;
    }

    return {
      ...existing,
      name: dto.name ?? existing.name,
      subject: dto.subject ?? existing.subject,
      bodyHtml: dto.bodyHtml ?? existing.bodyHtml,
      bodyText: dto.bodyText ?? existing.bodyText,
      updatedAt: new Date().toISOString(),
    };
  }
}
