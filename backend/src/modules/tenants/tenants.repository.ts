import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { TENANT_MIGRATIONS } from '../../infrastructure/database/migrations/migration-manifest';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { quoteIdent, quoteLiteral } from '../../infrastructure/database/sql-builder.util';
import { CreateTenantDto } from './dto/create-tenant.dto';

export type TenantEntity = {
  id: string;
  name: string;
  slug: string;
  schema: string;
  active: boolean;
  createdAt: string;
};

@Injectable()
export class TenantsRepository {
  constructor(private readonly drizzleService: DrizzleService) {}

  async list(): Promise<TenantEntity[]> {
    await this.ensureTenantsTable();

    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, name, slug, schema_name, active, created_at
      FROM public.tenants
      ORDER BY created_at ASC
    `));

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      schema: String(row.schema_name),
      active: Boolean(row.active),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }

  async create(dto: CreateTenantDto): Promise<TenantEntity> {
    await this.ensureTenantsTable();

    const tenantIdResult = await this.drizzleService
      .getClient()
      .execute(sql.raw(`SELECT COALESCE(${quoteLiteral(dto.id ?? null)}::uuid, gen_random_uuid()) AS id`));
    const tenantId = String((tenantIdResult.rows[0] as Record<string, unknown>).id);
    const schemaName = this.schemaFromTenant(tenantId);
    const baseSlug = this.slugify(dto.slug ?? dto.name);
    const slug = baseSlug.length > 0 ? baseSlug : `tenant-${tenantId.slice(0, 8)}`;

    await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO public.tenants (id, name, slug, schema_name, active)
      VALUES (
        ${quoteLiteral(tenantId)}::uuid,
        ${quoteLiteral(dto.name)},
        ${quoteLiteral(slug)},
        ${quoteLiteral(schemaName)},
        ${dto.active === false ? 'false' : 'true'}
      )
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        active = EXCLUDED.active,
        updated_at = NOW()
    `));

    await this.applyTenantMigrations(tenantId, schemaName);
    await this.ensureHeadquartersBranch(schemaName);

    const [tenant] = await this.findById(tenantId);
    return tenant;
  }

  private async findById(id: string): Promise<TenantEntity[]> {
    const result = await this.drizzleService.getClient().execute(sql.raw(`
      SELECT id, name, slug, schema_name, active, created_at
      FROM public.tenants
      WHERE id = ${quoteLiteral(id)}::uuid
      LIMIT 1
    `));

    if (result.rows.length === 0) {
      return [];
    }

    const row = result.rows[0] as Record<string, unknown>;
    return [
      {
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        schema: String(row.schema_name),
        active: Boolean(row.active),
        createdAt: new Date(String(row.created_at)).toISOString(),
      },
    ];
  }

  private async ensureTenantsTable(): Promise<void> {
    await this.drizzleService.getClient().execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(80) NOT NULL UNIQUE,
        schema_name VARCHAR(120) NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `));

    await this.drizzleService.getClient().execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS public.tenant_migrations (
        tenant_id UUID NOT NULL,
        migration_name VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        applied_at TIMESTAMP,
        duration_ms INTEGER,
        PRIMARY KEY (tenant_id, migration_name)
      )
    `));
  }

  private async applyTenantMigrations(tenantId: string, schemaName: string): Promise<void> {
    const quotedSchema = quoteIdent(schemaName);
    await this.drizzleService.getClient().execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`));

    for (const migration of TENANT_MIGRATIONS) {
      const alreadyApplied = await this.drizzleService.getClient().execute(sql.raw(`
        SELECT 1
        FROM public.tenant_migrations
        WHERE tenant_id = ${quoteLiteral(tenantId)}::uuid
          AND migration_name = ${quoteLiteral(migration.name)}
          AND status = 'SUCCESS'
        LIMIT 1
      `));

      if (alreadyApplied.rows.length > 0) {
        continue;
      }

      const start = Date.now();

      try {
        const statements = migration.run(quotedSchema);
        for (const statement of statements) {
          await this.drizzleService.getClient().execute(sql.raw(statement));
        }

        await this.drizzleService.getClient().execute(sql.raw(`
          INSERT INTO public.tenant_migrations (
            tenant_id, migration_name, status, applied_at, duration_ms
          ) VALUES (
            ${quoteLiteral(tenantId)}::uuid,
            ${quoteLiteral(migration.name)},
            'SUCCESS',
            NOW(),
            ${Date.now() - start}
          )
          ON CONFLICT (tenant_id, migration_name)
          DO UPDATE SET
            status = EXCLUDED.status,
            applied_at = EXCLUDED.applied_at,
            error_message = NULL,
            duration_ms = EXCLUDED.duration_ms
        `));
      } catch (error) {
        await this.drizzleService.getClient().execute(sql.raw(`
          INSERT INTO public.tenant_migrations (
            tenant_id, migration_name, status, error_message, duration_ms
          ) VALUES (
            ${quoteLiteral(tenantId)}::uuid,
            ${quoteLiteral(migration.name)},
            'FAILED',
            ${quoteLiteral(error instanceof Error ? error.message : 'unknown error')},
            ${Date.now() - start}
          )
          ON CONFLICT (tenant_id, migration_name)
          DO UPDATE SET
            status = EXCLUDED.status,
            error_message = EXCLUDED.error_message,
            duration_ms = EXCLUDED.duration_ms
        `));
        throw error;
      }
    }
  }

  private async ensureHeadquartersBranch(schemaName: string): Promise<void> {
    const schema = quoteIdent(schemaName);
    await this.drizzleService.getClient().execute(sql.raw(`
      INSERT INTO ${schema}.branches (name, legal_name, is_headquarters, active)
      SELECT 'Matriz', 'Matriz', true, true
      WHERE NOT EXISTS (
        SELECT 1 FROM ${schema}.branches WHERE is_headquarters = true AND deleted_at IS NULL
      )
    `));
  }

  private schemaFromTenant(tenantId: string): string {
    return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }
}
