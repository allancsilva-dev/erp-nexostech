import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';
import { TENANT_MIGRATIONS } from './migration-manifest';

loadEnv();

type Tenant = { id: string };

function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL nao definido');
  }
  return value;
}

function parseTenantArg(): string | undefined {
  const explicit = process.argv.find((arg) => arg.startsWith('--tenant='));
  if (!explicit) return undefined;
  return explicit.split('=')[1];
}

async function ensureControlTable(pool: Pool): Promise<void> {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.tenant_migrations (
      tenant_id UUID NOT NULL,
      migration_name VARCHAR(200) NOT NULL,
      status VARCHAR(20) NOT NULL,
      error_message TEXT,
      applied_at TIMESTAMP,
      duration_ms INTEGER,
      PRIMARY KEY (tenant_id, migration_name)
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_tenant_migrations_status ON public.tenant_migrations(status)',
  );
}

async function listTenants(
  pool: Pool,
  tenantOverride?: string,
): Promise<Tenant[]> {
  if (tenantOverride) {
    return [{ id: tenantOverride }];
  }

  // Supoe tabela public.tenants no auth/onboarding. Ajustar em ambiente real se necessario.
  const result = await pool.query<Tenant>(
    'SELECT id FROM public.tenants WHERE active = true ORDER BY created_at ASC',
  );
  return result.rows;
}

async function wasApplied(
  pool: Pool,
  tenantId: string,
  migrationName: string,
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM public.tenant_migrations
      WHERE tenant_id = $1 AND migration_name = $2 AND status = 'SUCCESS'
      LIMIT 1
    `,
    [tenantId, migrationName],
  );

  return result.rowCount > 0;
}

async function saveMigrationStatus(
  pool: Pool,
  params: {
    tenantId: string;
    migrationName: string;
    status: 'SUCCESS' | 'FAILED';
    errorMessage?: string;
    durationMs: number;
  },
): Promise<void> {
  await pool.query(
    `
      INSERT INTO public.tenant_migrations (
        tenant_id, migration_name, status, error_message, applied_at, duration_ms
      ) VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'SUCCESS' THEN NOW() ELSE NULL END, $5)
      ON CONFLICT (tenant_id, migration_name)
      DO UPDATE SET
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        applied_at = EXCLUDED.applied_at,
        duration_ms = EXCLUDED.duration_ms
    `,
    [
      params.tenantId,
      params.migrationName,
      params.status,
      params.errorMessage ?? null,
      params.durationMs,
    ],
  );
}

function schemaFromTenant(tenantId: string): string {
  // Converte caracteres invalidos em underscore para manter consistencia.
  return `tenant_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

async function applyForTenant(
  pool: Pool,
  tenantId: string,
  retryMode = false,
): Promise<void> {
  const schema = schemaFromTenant(tenantId);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  for (const migration of TENANT_MIGRATIONS) {
    if (!retryMode && (await wasApplied(pool, tenantId, migration.name))) {
      continue;
    }

    const start = Date.now();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${tenantId}:${migration.name}`,
      ]);

      const statements = migration.run(schema);
      for (const statement of statements) {
        await client.query(statement);
      }

      await client.query('COMMIT');

      await saveMigrationStatus(pool, {
        tenantId,
        migrationName: migration.name,
        status: 'SUCCESS',
        durationMs: Date.now() - start,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      await saveMigrationStatus(pool, {
        tenantId,
        migrationName: migration.name,
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'unknown error',
        durationMs: Date.now() - start,
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

async function run(): Promise<void> {
  const mode = process.argv[2] ?? 'apply';
  const tenantArg = parseTenantArg();

  if (mode === 'retry' && !tenantArg) {
    throw new Error('Uso: npm run migration:retry -- --tenant=<uuid>');
  }

  const pool = new Pool({ connectionString: requireDatabaseUrl() });
  try {
    await ensureControlTable(pool);

    const tenants = await listTenants(pool, tenantArg);
    for (const tenant of tenants) {
      await applyForTenant(pool, tenant.id, mode === 'retry');
    }
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('[tenant-migrations.runner] erro:', error);
  process.exit(1);
});
