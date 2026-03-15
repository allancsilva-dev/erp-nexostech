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
  {
    name: '002_create_financial_core_tables',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        type VARCHAR(20) NOT NULL,
        document VARCHAR(18),
        email VARCHAR(255),
        phone VARCHAR(20),
        active BOOLEAN NOT NULL DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_name ON ${schema}.contacts(name)`,

      `CREATE TABLE IF NOT EXISTS ${schema}.categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        parent_id UUID,
        color VARCHAR(7),
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_categories_branch_type ON ${schema}.categories(branch_id, type)`,

      `CREATE TABLE IF NOT EXISTS ${schema}.bank_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        name VARCHAR(100) NOT NULL,
        bank_code VARCHAR(10),
        agency VARCHAR(10),
        account_number VARCHAR(20),
        type VARCHAR(20) NOT NULL,
        initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        active BOOLEAN NOT NULL DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bank_accounts_branch ON ${schema}.bank_accounts(branch_id)`,

      `CREATE TABLE IF NOT EXISTS ${schema}.financial_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        document_number VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        description VARCHAR(200) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        paid_amount DECIMAL(15,2),
        status VARCHAR(30) NOT NULL,
        category_id UUID NOT NULL REFERENCES ${schema}.categories(id),
        contact_id UUID REFERENCES ${schema}.contacts(id),
        bank_account_id UUID REFERENCES ${schema}.bank_accounts(id),
        installment_number INTEGER,
        installment_total INTEGER,
        created_by VARCHAR(100) NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_entries_branch_status ON ${schema}.financial_entries(branch_id, status)`,

      `CREATE TABLE IF NOT EXISTS ${schema}.financial_entry_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id UUID NOT NULL REFERENCES ${schema}.financial_entries(id),
        amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(20),
        bank_account_id UUID,
        notes TEXT,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_entry_payments_entry ON ${schema}.financial_entry_payments(entry_id)`,
    ],
  },
  {
    name: '003_create_financial_transfers_table',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.financial_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        from_account_id UUID NOT NULL REFERENCES ${schema}.bank_accounts(id),
        to_account_id UUID NOT NULL REFERENCES ${schema}.bank_accounts(id),
        amount DECIMAL(15,2) NOT NULL,
        transfer_date DATE NOT NULL,
        description VARCHAR(255),
        created_by VARCHAR(100) NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_transfers_branch_date ON ${schema}.financial_transfers(branch_id, transfer_date)`,
    ],
  },
];
