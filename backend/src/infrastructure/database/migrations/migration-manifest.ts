export type TenantMigration = {
  name: string;
  run: (schema: string) => string[];
};

// Manifesto inicial. Cada migration retorna SQL statements idempotentes.
export const TENANT_MIGRATIONS: TenantMigration[] = [
  {
    name: '001_create_branches_table',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        legal_name VARCHAR(200),
        document VARCHAR(18),
        phone VARCHAR(20),
        email VARCHAR(255),
        address_street VARCHAR(200),
        address_number VARCHAR(20),
        address_complement VARCHAR(100),
        address_neighborhood VARCHAR(100),
        address_city VARCHAR(100),
        address_state VARCHAR(2),
        address_zip VARCHAR(10),
        is_headquarters BOOLEAN NOT NULL DEFAULT false,
        active BOOLEAN NOT NULL DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_branches_active ON ${schema}.branches(active)`,
    ],
  },
];
