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
  {
    name: '004_create_financial_settings_and_rules_tables',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.financial_settings (
        branch_id UUID PRIMARY KEY REFERENCES ${schema}.branches(id),
        closing_day INTEGER NOT NULL DEFAULT 1,
        currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
        alert_days_before INTEGER NOT NULL DEFAULT 3,
        email_alerts BOOLEAN NOT NULL DEFAULT true,
        max_refund_days_payable INTEGER NOT NULL DEFAULT 90,
        max_refund_days_receivable INTEGER NOT NULL DEFAULT 180,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS ${schema}.approval_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        entry_type VARCHAR(20),
        min_amount DECIMAL(15,2) NOT NULL,
        approver_role_id UUID NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_approval_rules_branch_active ON ${schema}.approval_rules(branch_id, active)`,
      `CREATE TABLE IF NOT EXISTS ${schema}.collection_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        event VARCHAR(20) NOT NULL,
        days_offset INTEGER NOT NULL,
        email_template_id UUID NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_collection_rules_branch_event ON ${schema}.collection_rules(branch_id, event)`,
    ],
  },
  {
    name: '005_create_audit_logs_table',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID REFERENCES ${schema}.branches(id),
        user_id VARCHAR(100) NOT NULL,
        action VARCHAR(20) NOT NULL,
        entity VARCHAR(80) NOT NULL,
        entity_id VARCHAR(100) NOT NULL,
        request_id VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON ${schema}.audit_logs(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_entity ON ${schema}.audit_logs(branch_id, entity)`,
    ],
  },
  {
    name: '006_create_rbac_tables',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        description VARCHAR(200),
        is_system BOOLEAN NOT NULL DEFAULT false,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_name_active
       ON ${schema}.roles(name)
       WHERE deleted_at IS NULL`,
      `CREATE TABLE IF NOT EXISTS ${schema}.role_permissions (
        role_id UUID NOT NULL REFERENCES ${schema}.roles(id) ON DELETE CASCADE,
        permission_code VARCHAR(120) NOT NULL,
        PRIMARY KEY (role_id, permission_code)
      )`,
    ],
  },
];
