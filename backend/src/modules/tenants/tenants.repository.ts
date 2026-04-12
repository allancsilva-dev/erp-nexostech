import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { TENANT_MIGRATIONS } from '../../infrastructure/database/migrations/migration-manifest';
import { DrizzleService } from '../../infrastructure/database/drizzle.service';
import { generateTenantSchema } from '../../infrastructure/database/tenant-schema.util';
import {
  quoteIdent,
  quoteLiteral,
} from '../../infrastructure/database/sql-builder.util';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CreateTenantDto } from './dto/create-tenant.dto';

export type TenantEntity = {
  id: string;
  name: string;
  slug: string;
  schema: string;
  active: boolean;
  createdAt: string;
};

/** Permissões de cada role padrão (Seção 12.3 do prompt-backend.md) */
const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    name: 'Admin',
    description: 'Acesso total ao sistema',
    permissions: [
      'financial.dashboard.view',
      'financial.entries.view',
      'financial.entries.create',
      'financial.entries.edit',
      'financial.entries.pay',
      'financial.entries.cancel',
      'financial.entries.delete',
      'financial.entries.restore',
      'financial.entries.approve',
      'financial.categories.view',
      'financial.categories.manage',
      'financial.reconciliation.execute',
      'financial.reports.view',
      'financial.reports.export',
      'financial.settings.manage',
      'financial.audit.view',
      'financial.bank_accounts.manage',
      'financial.transfers.manage',
      'financial.approval_rules.manage',
      'admin.branches.manage',
      'admin.users.manage',
      'contacts.view',
      'contacts.manage',
    ],
  },
  {
    name: 'Financeiro',
    description: 'Operações financeiras completas',
    permissions: [
      'financial.dashboard.view',
      'financial.entries.view',
      'financial.entries.create',
      'financial.entries.edit',
      'financial.entries.pay',
      'financial.entries.cancel',
      'financial.categories.view',
      'financial.reconciliation.execute',
      'financial.reports.view',
      'financial.reports.export',
      'financial.bank_accounts.manage',
      'financial.transfers.manage',
      'contacts.view',
      'contacts.manage',
    ],
  },
  {
    name: 'Vendas',
    description: 'Criação e consulta de lançamentos a receber',
    permissions: [
      'financial.dashboard.view',
      'financial.entries.view',
      'financial.entries.create',
      'financial.categories.view',
      'contacts.view',
      'contacts.manage',
    ],
  },
  {
    name: 'Auditor',
    description: 'Acesso somente leitura e relatórios',
    permissions: [
      'financial.dashboard.view',
      'financial.entries.view',
      'financial.categories.view',
      'financial.reports.view',
      'financial.reports.export',
      'financial.audit.view',
      'contacts.view',
    ],
  },
];

/** Categorias padrão criadas para a Matriz no onboarding */
const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: 'RECEIVABLE' | 'PAYABLE';
}> = [
  { name: 'Vendas de Produtos', type: 'RECEIVABLE' },
  { name: 'Vendas de Serviços', type: 'RECEIVABLE' },
  { name: 'Outras Receitas', type: 'RECEIVABLE' },
  { name: 'Aluguel', type: 'PAYABLE' },
  { name: 'Folha de Pagamento', type: 'PAYABLE' },
  { name: 'Impostos e Tributos', type: 'PAYABLE' },
  { name: 'Marketing', type: 'PAYABLE' },
  { name: 'Fornecedores', type: 'PAYABLE' },
  { name: 'Utilities (Energia, Água, Internet)', type: 'PAYABLE' },
  { name: 'Outras Despesas', type: 'PAYABLE' },
];

/** Regras padrão de régua de cobrança */
const DEFAULT_COLLECTION_RULES: Array<{
  name: string;
  trigger: string;
  offsetDays: number;
  channel: string;
}> = [
  {
    name: 'Aviso 7 dias antes',
    trigger: 'BEFORE_DUE',
    offsetDays: -7,
    channel: 'EMAIL',
  },
  {
    name: 'Aviso 1 dia antes',
    trigger: 'BEFORE_DUE',
    offsetDays: -1,
    channel: 'EMAIL',
  },
  { name: 'No vencimento', trigger: 'ON_DUE', offsetDays: 0, channel: 'EMAIL' },
  {
    name: 'Atraso 3 dias',
    trigger: 'AFTER_DUE',
    offsetDays: 3,
    channel: 'EMAIL',
  },
  {
    name: 'Atraso 10 dias',
    trigger: 'AFTER_DUE',
    offsetDays: 10,
    channel: 'EMAIL',
  },
  {
    name: 'Confirmação de pagamento',
    trigger: 'ON_PAYMENT',
    offsetDays: 0,
    channel: 'EMAIL',
  },
];

@Injectable()
export class TenantsRepository {
  private readonly logger = new Logger(TenantsRepository.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly cacheService: CacheService,
  ) {}

  async list(): Promise<TenantEntity[]> {
    await this.ensureTenantsTable();

    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, name, slug, schema_name, active, created_at
      FROM public.tenants
      ORDER BY created_at ASC
    `),
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      schema: String(row.schema_name),
      active: Boolean(row.active),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }

  /**
   * Cria e onboarda um novo tenant com todos os 12 passos.
   * Em caso de falha em qualquer passo, executa DROP SCHEMA CASCADE.
   */
  async create(
    dto: CreateTenantDto,
    adminUserId?: string,
  ): Promise<TenantEntity> {
    await this.ensureTenantsTable();

    const tenantIdResult = await this.drizzleService
      .getClient()
      .execute(
        sql.raw(
          `SELECT COALESCE(${quoteLiteral(dto.id ?? null)}::uuid, gen_random_uuid()) AS id`,
        ),
      );
    const tenantId = String(tenantIdResult.rows[0].id);
    const schemaName = generateTenantSchema(dto.name, tenantId);
    const quotedSchema = quoteIdent(schemaName);
    const baseSlug = this.slugify(dto.slug ?? dto.name);
    const slug =
      baseSlug.length > 0 ? baseSlug : `tenant-${tenantId.slice(0, 8)}`;

    // Registrar tenant em public.tenants ANTES de criar o schema
    await this.drizzleService.getClient().execute(
      sql.raw(`
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
    `),
    );

    await this.cacheService.del(`tenant:schema:${tenantId}`);

    try {
      // PASSO 1 — Criar schema e aplicar todas as migrations (DDL)
      await this.applyTenantMigrations(tenantId, schemaName);

      // PASSOS 2-12 — Seed de dados dentro de uma única transação (DML)
      await this.drizzleService.transaction(async (tx) => {
        // PASSO 2 — Criar filial "Matriz" com is_headquarters=true
        const branchResult = await tx.execute(
          sql.raw(`
          INSERT INTO ${quotedSchema}.branches (name, legal_name, is_headquarters, active)
          SELECT 'Matriz', ${quoteLiteral(dto.name)}, true, true
          WHERE NOT EXISTS (
            SELECT 1 FROM ${quotedSchema}.branches WHERE is_headquarters = true AND deleted_at IS NULL
          )
          RETURNING id
        `),
        );

        let matrizId: string;
        if (branchResult.rows.length > 0) {
          matrizId = String(branchResult.rows[0].id);
        } else {
          const existing = await tx.execute(
            sql.raw(`
            SELECT id FROM ${quotedSchema}.branches WHERE is_headquarters = true AND deleted_at IS NULL LIMIT 1
          `),
          );
          matrizId = String(existing.rows[0].id);
        }

        // PASSO 3 — Criar roles padrão (Admin, Financeiro, Vendas, Auditor) com is_system=true
        const roleIds: Record<string, string> = {};
        for (const roleDef of DEFAULT_ROLES) {
          const result = await tx.execute(
            sql.raw(`
            INSERT INTO ${quotedSchema}.roles (name, description, is_system)
            VALUES (${quoteLiteral(roleDef.name)}, ${quoteLiteral(roleDef.description)}, true)
            ON CONFLICT DO NOTHING
            RETURNING id
          `),
          );

          let roleId: string;
          if (result.rows.length > 0) {
            roleId = String(result.rows[0].id);
          } else {
            const existing = await tx.execute(
              sql.raw(`
              SELECT id FROM ${quotedSchema}.roles WHERE name = ${quoteLiteral(roleDef.name)} LIMIT 1
            `),
            );
            roleId = String(existing.rows[0].id);
          }
          roleIds[roleDef.name] = roleId;
        }

        // PASSO 4-5 — Atribuir permissões corretas a cada role
        for (const roleDef of DEFAULT_ROLES) {
          const roleId = roleIds[roleDef.name];
          if (!roleId) continue;
          for (const perm of roleDef.permissions) {
            await tx.execute(
              sql.raw(`
              INSERT INTO ${quotedSchema}.role_permissions (role_id, permission_code)
              VALUES (${quoteLiteral(roleId)}::uuid, ${quoteLiteral(perm)})
              ON CONFLICT DO NOTHING
            `),
            );
          }
        }

        // PASSO 6 — Vincular role Admin ao usuário que fez o primeiro acesso
        if (adminUserId) {
          const adminRoleId = roleIds['Admin'];
          if (adminRoleId) {
            await tx.execute(
              sql.raw(`
              INSERT INTO ${quotedSchema}.user_roles (user_id, role_id)
              VALUES (${quoteLiteral(adminUserId)}, ${quoteLiteral(adminRoleId)}::uuid)
              ON CONFLICT DO NOTHING
            `),
            );
          }
        }

        // PASSO 7 — Já feito no PASSO 2 (Matriz criada)

        // PASSO 8 — Vincular usuário Admin à Matriz via user_branches
        if (adminUserId) {
          await tx.execute(
            sql.raw(`
            INSERT INTO ${quotedSchema}.user_branches (user_id, branch_id)
            VALUES (${quoteLiteral(adminUserId)}, ${quoteLiteral(matrizId)}::uuid)
            ON CONFLICT DO NOTHING
          `),
          );
        }

        // PASSO 9 — Criar categorias padrão na filial Matriz
        for (const cat of DEFAULT_CATEGORIES) {
          await tx.execute(
            sql.raw(`
            INSERT INTO ${quotedSchema}.categories (branch_id, name, type, active)
            VALUES (
              ${quoteLiteral(matrizId)}::uuid,
              ${quoteLiteral(cat.name)},
              ${quoteLiteral(cat.type)},
              true
            )
            ON CONFLICT DO NOTHING
          `),
          );
        }

        // PASSO 10 — Criar financial_settings para a Matriz com defaults
        await tx.execute(
          sql.raw(`
          INSERT INTO ${quotedSchema}.financial_settings (
            branch_id,
            closing_day,
            currency,
            alert_days_before,
            email_alerts,
            max_refund_days_payable,
            max_refund_days_receivable
          ) VALUES (
            ${quoteLiteral(matrizId)}::uuid,
            1,
            'BRL',
            3,
            true,
            90,
            180
          )
          ON CONFLICT (branch_id) DO NOTHING
        `),
        );

        // PASSO 11 — Inicializar document_sequences para a Matriz (PAYABLE + RECEIVABLE)
        const currentYear = new Date().getFullYear();
        for (const type of ['PAY', 'REC']) {
          await tx.execute(
            sql.raw(`
            INSERT INTO ${quotedSchema}.document_sequences (branch_id, type, year, last_sequence)
            VALUES (${quoteLiteral(matrizId)}::uuid, ${quoteLiteral(type)}, ${currentYear}, 0)
            ON CONFLICT (branch_id, type, year) DO NOTHING
          `),
          );
        }

        // PASSO 12 — Criar collection_rules padrão (régua de cobrança)
        for (const rule of DEFAULT_COLLECTION_RULES) {
          await tx.execute(
            sql.raw(`
            INSERT INTO ${quotedSchema}.collection_rules (
              branch_id, name, trigger_event, offset_days, channel, active
            ) VALUES (
              ${quoteLiteral(matrizId)}::uuid,
              ${quoteLiteral(rule.name)},
              ${quoteLiteral(rule.trigger)},
              ${rule.offsetDays},
              ${quoteLiteral(rule.channel)},
              true
            )
            ON CONFLICT DO NOTHING
          `),
          );
        }
      });
    } catch (error) {
      // Falha em qualquer passo: DROP SCHEMA CASCADE (remove schema + todas as tabelas)
      this.logger.error(
        `Onboarding falhou para tenant ${tenantId}. Executando rollback (DROP SCHEMA CASCADE).`,
        error instanceof Error ? error.stack : String(error),
      );
      try {
        await this.drizzleService
          .getClient()
          .execute(sql.raw(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`));
      } catch (dropError) {
        this.logger.error(
          `Falha ao fazer DROP SCHEMA ${schemaName} durante rollback:`,
          dropError instanceof Error ? dropError.stack : String(dropError),
        );
      }
      throw new BusinessException('ONBOARDING_FAILED', undefined, {
        tenantId,
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    const [tenant] = await this.findById(tenantId);
    return tenant;
  }

  private async findById(id: string): Promise<TenantEntity[]> {
    const result = await this.drizzleService.getClient().execute(
      sql.raw(`
      SELECT id, name, slug, schema_name, active, created_at
      FROM public.tenants
      WHERE id = ${quoteLiteral(id)}::uuid
      LIMIT 1
    `),
    );

    if (result.rows.length === 0) {
      return [];
    }

    const row = result.rows[0];
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
    await this.drizzleService.getClient().execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id UUID PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(80) NOT NULL UNIQUE,
        schema_name VARCHAR(120) NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `),
    );

    await this.drizzleService.getClient().execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS public.tenant_migrations (
        tenant_id UUID NOT NULL,
        migration_name VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        applied_at TIMESTAMP,
        duration_ms INTEGER,
        PRIMARY KEY (tenant_id, migration_name)
      )
    `),
    );

    await this.drizzleService.getClient().execute(
      sql.raw(`
      CREATE TABLE IF NOT EXISTS public.outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        event_name VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP NULL
      )
    `),
    );

    await this.drizzleService.getClient().execute(
      sql.raw(`
      CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed
      ON public.outbox_events (processed_at, created_at)
      WHERE processed_at IS NULL
    `),
    );
  }

  private async applyTenantMigrations(
    tenantId: string,
    schemaName: string,
  ): Promise<void> {
    const quotedSchema = quoteIdent(schemaName);
    await this.drizzleService
      .getClient()
      .execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`));

    for (const migration of TENANT_MIGRATIONS) {
      const alreadyApplied = await this.drizzleService.getClient().execute(
        sql.raw(`
        SELECT 1
        FROM public.tenant_migrations
        WHERE tenant_id = ${quoteLiteral(tenantId)}::uuid
          AND migration_name = ${quoteLiteral(migration.name)}
          AND status = 'SUCCESS'
        LIMIT 1
      `),
      );

      if (alreadyApplied.rows.length > 0) {
        continue;
      }

      const start = Date.now();

      try {
        const statements = migration.run(quotedSchema);
        for (const statement of statements) {
          await this.drizzleService.getClient().execute(sql.raw(statement));
        }

        await this.drizzleService.getClient().execute(
          sql.raw(`
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
        `),
        );
      } catch (error) {
        await this.drizzleService.getClient().execute(
          sql.raw(`
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
        `),
        );
        throw error;
      }
    }
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
