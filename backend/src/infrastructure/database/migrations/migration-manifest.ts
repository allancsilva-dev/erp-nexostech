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
        trigger_event VARCHAR(20) NOT NULL,
        offset_days INTEGER NOT NULL,
        name VARCHAR(100),
        channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
        email_template_id UUID,
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_collection_rules_branch_event ON ${schema}.collection_rules(branch_id, trigger_event)`,
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
      `CREATE TABLE IF NOT EXISTS ${schema}.user_roles (
        user_id VARCHAR(100) NOT NULL,
        role_id UUID NOT NULL REFERENCES ${schema}.roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )`,
      `CREATE TABLE IF NOT EXISTS ${schema}.user_branches (
        user_id VARCHAR(100) NOT NULL,
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, branch_id)
      )`,
    ],
  },
  {
    name: '007_create_approvals_and_lock_periods_tables',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.entry_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id UUID NOT NULL REFERENCES ${schema}.financial_entries(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        approved_by VARCHAR(100) NOT NULL,
        action VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_entry_approvals_entry ON ${schema}.entry_approvals(entry_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS ${schema}.lock_periods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        locked_until DATE NOT NULL,
        reason VARCHAR(200),
        locked_by VARCHAR(100) NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_lock_periods_branch_until ON ${schema}.lock_periods(branch_id, locked_until DESC)`,
    ],
  },
  {
    name: '008_create_financial_boletos_table',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.financial_boletos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id UUID NOT NULL UNIQUE REFERENCES ${schema}.financial_entries(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        gateway_boleto_id VARCHAR(120) NOT NULL,
        status VARCHAR(20) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        due_date DATE NOT NULL,
        pdf_url TEXT,
        paid_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_financial_boletos_branch_status ON ${schema}.financial_boletos(branch_id, status)`,
    ],
  },
  {
    name: '009_create_financial_jobs_support_tables',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.document_sequences (
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        type VARCHAR(10) NOT NULL,
        year INTEGER NOT NULL,
        last_sequence INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (branch_id, type, year)
      )`,
      `CREATE TABLE IF NOT EXISTS ${schema}.recurrences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        type VARCHAR(20) NOT NULL,
        description VARCHAR(200) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        category_id UUID NOT NULL REFERENCES ${schema}.categories(id),
        contact_id UUID REFERENCES ${schema}.contacts(id),
        bank_account_id UUID REFERENCES ${schema}.bank_accounts(id),
        frequency VARCHAR(20) NOT NULL,
        next_due_date DATE NOT NULL,
        generated_count INTEGER NOT NULL DEFAULT 0,
        max_occurrences INTEGER,
        active BOOLEAN NOT NULL DEFAULT true,
        created_by VARCHAR(100) NOT NULL,
        last_generated_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_recurrences_due ON ${schema}.recurrences(branch_id, next_due_date)`,
      `CREATE TABLE IF NOT EXISTS ${schema}.collection_dispatches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id UUID NOT NULL REFERENCES ${schema}.collection_rules(id) ON DELETE CASCADE,
        entry_id UUID NOT NULL REFERENCES ${schema}.financial_entries(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        email_template_id UUID NOT NULL,
        channel VARCHAR(20) NOT NULL,
        dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) NOT NULL,
        scheduled_for TIMESTAMP,
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (rule_id, entry_id, dispatch_date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_collection_dispatches_status ON ${schema}.collection_dispatches(status, scheduled_for)`,
    ],
  },
  {
    name: '010_create_reconciliation_tables',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.reconciliation_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        bank_account_id UUID NOT NULL REFERENCES ${schema}.bank_accounts(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reconciliation_batches_branch ON ${schema}.reconciliation_batches(branch_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS ${schema}.reconciliation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID NOT NULL REFERENCES ${schema}.reconciliation_batches(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        payment_id UUID NOT NULL REFERENCES ${schema}.financial_entry_payments(id),
        entry_id UUID NOT NULL REFERENCES ${schema}.financial_entries(id),
        amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        reconciled BOOLEAN NOT NULL DEFAULT false,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (batch_id, payment_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reconciliation_items_branch_pending ON ${schema}.reconciliation_items(branch_id, reconciled, payment_date DESC)`,
    ],
  },
  {
    name: '011_create_email_templates_table',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID NOT NULL REFERENCES ${schema}.branches(id),
        name VARCHAR(100) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT NOT NULL,
        type VARCHAR(20) NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_email_templates_branch_name_active
       ON ${schema}.email_templates(branch_id, name)
       WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_email_templates_branch_type ON ${schema}.email_templates(branch_id, type)`,
    ],
  },
  {
    name: '012_alter_audit_logs_add_field_changes',
    run: (schema) => [
      `ALTER TABLE ${schema}.audit_logs
       ADD COLUMN IF NOT EXISTS field_changes JSONB`,
      `ALTER TABLE ${schema}.audit_logs
       ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`,
      `ALTER TABLE ${schema}.audit_logs
       ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)`,
    ],
  },
  {
    name: '013_composite_fk_branch_isolation',
    run: (schema) => [
      // PASSO 0 — Verificar dados inválidos antes de criar as FKs compostas.
      // Se houver entries referenciando category/bank_account de outra filial,
      // esta migration falhará com um erro claro antes de tentar alterar o schema.
      `DO $$
       DECLARE
         invalid_category_count INTEGER;
         invalid_bank_count INTEGER;
       BEGIN
         SELECT COUNT(*) INTO invalid_category_count
         FROM ${schema}.financial_entries fe
         LEFT JOIN ${schema}.categories c
           ON fe.category_id = c.id AND fe.branch_id = c.branch_id
         WHERE fe.category_id IS NOT NULL AND c.id IS NULL;

         IF invalid_category_count > 0 THEN
           RAISE EXCEPTION
             'Migration abortada: % entries com category_id de outra filial. Corrija antes de continuar.',
             invalid_category_count;
         END IF;

         SELECT COUNT(*) INTO invalid_bank_count
         FROM ${schema}.financial_entries fe
         LEFT JOIN ${schema}.bank_accounts b
           ON fe.bank_account_id = b.id AND fe.branch_id = b.branch_id
         WHERE fe.bank_account_id IS NOT NULL AND b.id IS NULL;

         IF invalid_bank_count > 0 THEN
           RAISE EXCEPTION
             'Migration abortada: % entries com bank_account_id de outra filial. Corrija antes de continuar.',
             invalid_bank_count;
         END IF;
       END $$`,

      // PASSO 1 — Adicionar UNIQUE(id, branch_id) em categories para suportar FK composta
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE constraint_schema = REPLACE('${schema}', '"', '')
             AND table_name = 'categories'
             AND constraint_name = 'uq_categories_id_branch'
         ) THEN
           ALTER TABLE ${schema}.categories
           ADD CONSTRAINT uq_categories_id_branch UNIQUE (id, branch_id);
         END IF;
       END $$`,

      // PASSO 2 — Adicionar UNIQUE(id, branch_id) em bank_accounts para suportar FK composta
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE constraint_schema = REPLACE('${schema}', '"', '')
             AND table_name = 'bank_accounts'
             AND constraint_name = 'uq_bank_accounts_id_branch'
         ) THEN
           ALTER TABLE ${schema}.bank_accounts
           ADD CONSTRAINT uq_bank_accounts_id_branch UNIQUE (id, branch_id);
         END IF;
       END $$`,

      // PASSO 3 — Adicionar branch_id em financial_entries.categories FK como FK composta.
      // Dropa a FK simples (se existir) e cria a composta.
      // Usa nome genérico pois o nome da constraint pode variar.
      `DO $$
       DECLARE
         fk_name TEXT;
       BEGIN
         SELECT tc.constraint_name INTO fk_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
           AND tc.table_schema = rc.constraint_schema
         JOIN information_schema.key_column_usage ccu
           ON ccu.constraint_name = rc.unique_constraint_name
           AND ccu.table_schema = rc.unique_constraint_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = REPLACE('${schema}', '"', '')
           AND tc.table_name = 'financial_entries'
           AND kcu.column_name = 'category_id'
           AND ccu.table_name = 'categories'
           AND ccu.column_name = 'id'
           AND (SELECT COUNT(*) FROM information_schema.key_column_usage
                WHERE constraint_name = tc.constraint_name
                  AND table_schema = tc.table_schema) = 1
         LIMIT 1;

         IF fk_name IS NOT NULL THEN
           EXECUTE format('ALTER TABLE ${schema}.financial_entries DROP CONSTRAINT %I', fk_name);
         END IF;
       END $$`,

      // PASSO 4 — Adicionar FK composta category_id + branch_id → categories(id, branch_id)
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE constraint_schema = REPLACE('${schema}', '"', '')
             AND table_name = 'financial_entries'
             AND constraint_name = 'fk_entries_category_branch'
         ) THEN
           ALTER TABLE ${schema}.financial_entries
           ADD CONSTRAINT fk_entries_category_branch
           FOREIGN KEY (category_id, branch_id)
           REFERENCES ${schema}.categories(id, branch_id);
         END IF;
       END $$`,

      // PASSO 5 — Dropa FK simples de bank_account_id (se existir)
      `DO $$
       DECLARE
         fk_name TEXT;
       BEGIN
         SELECT tc.constraint_name INTO fk_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.referential_constraints rc
           ON tc.constraint_name = rc.constraint_name
           AND tc.table_schema = rc.constraint_schema
         JOIN information_schema.key_column_usage ccu
           ON ccu.constraint_name = rc.unique_constraint_name
           AND ccu.table_schema = rc.unique_constraint_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = REPLACE('${schema}', '"', '')
           AND tc.table_name = 'financial_entries'
           AND kcu.column_name = 'bank_account_id'
           AND ccu.table_name = 'bank_accounts'
           AND ccu.column_name = 'id'
           AND (SELECT COUNT(*) FROM information_schema.key_column_usage
                WHERE constraint_name = tc.constraint_name
                  AND table_schema = tc.table_schema) = 1
         LIMIT 1;

         IF fk_name IS NOT NULL THEN
           EXECUTE format('ALTER TABLE ${schema}.financial_entries DROP CONSTRAINT %I', fk_name);
         END IF;
       END $$`,

      // PASSO 6 — Adicionar FK composta bank_account_id + branch_id → bank_accounts(id, branch_id)
      // bank_account_id é nullable (pagamentos sem conta definida são válidos)
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints
           WHERE constraint_schema = REPLACE('${schema}', '"', '')
             AND table_name = 'financial_entries'
             AND constraint_name = 'fk_entries_bank_account_branch'
         ) THEN
           ALTER TABLE ${schema}.financial_entries
           ADD CONSTRAINT fk_entries_bank_account_branch
           FOREIGN KEY (bank_account_id, branch_id)
           REFERENCES ${schema}.bank_accounts(id, branch_id);
         END IF;
       END $$`,
    ],
  },
  {
    name: '014_add_user_roles_email_cache',
    run: (schema) => [
      `ALTER TABLE ${schema}.user_roles
       ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
    ],
  },
  {
    name: '015_create_attachments_table',
    run: (schema) => [
      `CREATE TABLE IF NOT EXISTS ${schema}.attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id UUID NOT NULL REFERENCES ${schema}.financial_entries(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        storage_key TEXT NOT NULL,
        mime_type VARCHAR(120) NOT NULL,
        size_bytes BIGINT NOT NULL,
        uploaded_by VARCHAR(100) NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_attachments_entry_active ON ${schema}.attachments(entry_id, deleted_at)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_attachments_storage_key ON ${schema}.attachments(storage_key)`,
    ],
  },
  {
    name: '016_document_number_nullable_and_unique_index',
    run: (schema) => [
      `ALTER TABLE ${schema}.financial_entries
       ALTER COLUMN document_number DROP NOT NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_entries_branch_document_number
       ON ${schema}.financial_entries(branch_id, document_number)
       WHERE document_number IS NOT NULL AND deleted_at IS NULL`,
    ],
  },
  {
    name: '017_create_notifications_table',
    run: (schema) => [
      `-- Notifications table: stores per-user notifications. created_at uses TIMESTAMP (without timezone)
       CREATE TABLE IF NOT EXISTS ${schema}.notifications (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL,
         branch_id UUID,
         type VARCHAR(50) NOT NULL,
         title VARCHAR(200) NOT NULL,
         message TEXT NOT NULL,
         metadata JSONB,
         read_at TIMESTAMP,
         deleted_at TIMESTAMP,
         created_at TIMESTAMP NOT NULL DEFAULT NOW()
       )`,
      `-- Active listing index: only non-deleted rows
       CREATE INDEX IF NOT EXISTS idx_notifications_user_active
       ON ${schema}.notifications (user_id, created_at DESC)
       WHERE deleted_at IS NULL`,
      `-- Unread index (also excludes soft-deleted rows)
       CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
       ON ${schema}.notifications (user_id)
       WHERE read_at IS NULL AND deleted_at IS NULL`,
      `-- Deduplication / idempotency index: dedupe per user/entry/day.
       -- Deduplicação por dia usa date_trunc('day', created_at).
       -- Assume created_at armazenado em UTC (TIMESTAMP WITHOUT TIME ZONE).
       -- Se o servidor PG não estiver em UTC, ajustar para:
       -- date_trunc('day', created_at AT TIME ZONE 'UTC')
       -- Opção A MVP: soft-deleted notifications still block re-creation
       -- within the same day. By design.
       CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency
       ON ${schema}.notifications (
         user_id,
         type,
         (metadata->>'entry_id'),
         date_trunc('day', created_at)
       )
       WHERE metadata->>'entry_id' IS NOT NULL`,
    ],
  },
  {
    name: '018_add_financial_entries_listing_indexes',
    run: (schema) => [
      `CREATE INDEX IF NOT EXISTS idx_entries_branch_created_active
       ON ${schema}.financial_entries (branch_id, created_at DESC, id DESC)
       WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_entries_branch_due_active
       ON ${schema}.financial_entries (branch_id, due_date DESC, id DESC)
       WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_entries_branch_amount_active
       ON ${schema}.financial_entries (branch_id, amount DESC, id DESC)
       WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_entries_branch_status_due_active
       ON ${schema}.financial_entries (branch_id, status, due_date DESC, id DESC)
       WHERE deleted_at IS NULL`,
      `CREATE INDEX IF NOT EXISTS idx_entries_branch_category_active
       ON ${schema}.financial_entries (branch_id, category_id)
       WHERE deleted_at IS NULL`,
    ],
  },
];
