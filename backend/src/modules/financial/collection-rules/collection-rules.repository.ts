import { HttpStatus, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { DrizzleService } from '../../../infrastructure/database/drizzle.service';
import {
  quoteIdent,
  quoteLiteral,
} from '../../../infrastructure/database/sql-builder.util';
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

  private mapEmailTemplateRow(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      name: String(row.name),
      subject: String(row.subject),
      bodyHtml: String(row.body_html),
      bodyText: String(row.body_text),
      type: String(row.type),
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
  }

  async list(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, event, days_offset, email_template_id, active, sort_order, created_at
      FROM ${schema}.collection_rules
      WHERE branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC, created_at ASC
    `),
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async create(branchId: string, dto: CreateCollectionRuleDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const branchLiteral = quoteLiteral(branchId);
    const eventLiteral = quoteLiteral(dto.event);
    const daysOffsetLiteral = quoteLiteral(dto.daysOffset);
    const emailTemplateIdLiteral = quoteLiteral(dto.emailTemplateId);
    const activeLiteral = quoteLiteral(dto.active);
    const sortOrderLiteral = quoteLiteral(dto.sortOrder);

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      INSERT INTO ${schema}.collection_rules (
        branch_id, event, days_offset, email_template_id, active, sort_order
      ) VALUES (
        ${branchLiteral}, ${eventLiteral}, ${daysOffsetLiteral}, ${emailTemplateIdLiteral}, ${activeLiteral}, ${sortOrderLiteral}
      )
      RETURNING id, branch_id, event, days_offset, email_template_id, active, sort_order, created_at
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
      SELECT id, branch_id, event, days_offset, email_template_id, active, sort_order, created_at
      FROM ${schema}.collection_rules
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  async update(id: string, branchId: string, dto: UpdateCollectionRuleDto) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const idLiteral = quoteLiteral(id);
    const branchLiteral = quoteLiteral(branchId);
    const sets: string[] = [];

    if (dto.event !== undefined)
      sets.push(`event = ${quoteLiteral(dto.event)}`);
    if (dto.daysOffset !== undefined)
      sets.push(`days_offset = ${quoteLiteral(dto.daysOffset)}`);
    if (dto.emailTemplateId !== undefined) {
      sets.push(`email_template_id = ${quoteLiteral(dto.emailTemplateId)}`);
    }
    if (dto.active !== undefined)
      sets.push(`active = ${quoteLiteral(dto.active)}`);
    if (dto.sortOrder !== undefined)
      sets.push(`sort_order = ${quoteLiteral(dto.sortOrder)}`);

    if (sets.length > 0) {
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.collection_rules
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
        { id, branchId, operation: 'RELOAD_COLLECTION_RULE' },
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
      UPDATE ${schema}.collection_rules
      SET deleted_at = NOW(), active = false
      WHERE id = ${idLiteral}
        AND branch_id = ${branchLiteral}
        AND deleted_at IS NULL
    `),
    );
  }

  async listEmailTemplates(branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, name, subject, body_html, body_text, type, created_at, updated_at
      FROM ${schema}.email_templates
      WHERE branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      ORDER BY name ASC
    `),
    );

    return result.rows.map((row) => this.mapEmailTemplateRow(row));
  }

  async findEmailTemplateById(id: string, branchId: string) {
    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, branch_id, name, subject, body_html, body_text, type, created_at, updated_at
      FROM ${schema}.email_templates
      WHERE id = ${quoteLiteral(id)}
        AND branch_id = ${quoteLiteral(branchId)}
        AND deleted_at IS NULL
      LIMIT 1
    `),
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? this.mapEmailTemplateRow(row) : null;
  }

  async updateEmailTemplate(
    id: string,
    branchId: string,
    dto: UpdateEmailTemplateDto,
  ) {
    const existing = await this.findEmailTemplateById(id, branchId);
    if (!existing) {
      return null;
    }

    const schema = quoteIdent(this.drizzleService.getTenantSchema());
    const sets: string[] = [];
    if (dto.name !== undefined) sets.push(`name = ${quoteLiteral(dto.name)}`);
    if (dto.subject !== undefined)
      sets.push(`subject = ${quoteLiteral(dto.subject)}`);
    if (dto.bodyHtml !== undefined)
      sets.push(`body_html = ${quoteLiteral(dto.bodyHtml)}`);
    if (dto.bodyText !== undefined)
      sets.push(`body_text = ${quoteLiteral(dto.bodyText)}`);

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      await this.drizzleService.getClient().execute(
        sql.raw(`
        UPDATE ${schema}.email_templates
        SET ${sets.join(', ')}
        WHERE id = ${quoteLiteral(id)}
          AND branch_id = ${quoteLiteral(branchId)}
          AND deleted_at IS NULL
      `),
      );
    }

    return this.findEmailTemplateById(id, branchId);
  }
}
