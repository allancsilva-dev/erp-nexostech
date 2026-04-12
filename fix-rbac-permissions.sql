-- ============================================================
-- FIX: Adicionar permissões faltantes ao tenant existente
-- Tenant: tenant_nexos_tech_bf8c955c
-- Executar via: docker exec -it erp-nexostech-postgres psql -U zonadev_admin -d erp_nexostech_db -f /tmp/fix-rbac-permissions.sql
-- ============================================================

BEGIN;

SET search_path TO tenant_nexos_tech_bf8c955c;

-- 1. Inserir permissões no catálogo
INSERT INTO permissions (id, code, module, description)
VALUES
  (gen_random_uuid(), 'financial.transfers.manage', 'financial', 'Criar e gerenciar transferências entre contas'),
  (gen_random_uuid(), 'contacts.view', 'contacts', 'Visualizar contatos'),
  (gen_random_uuid(), 'contacts.manage', 'contacts', 'Gerenciar contatos')
ON CONFLICT (code) DO NOTHING;

-- 2. Vincular financial.transfers.manage ao Admin e Financeiro
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Admin', 'Financeiro')
  AND p.code = 'financial.transfers.manage'
  AND r.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- 3. Vincular contacts.view a TODAS as roles (Admin, Financeiro, Vendas, Auditor)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'contacts.view'
  AND r.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- 4. Vincular contacts.manage ao Admin, Financeiro e Vendas (NÃO Auditor)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('Admin', 'Financeiro', 'Vendas')
  AND p.code = 'contacts.manage'
  AND r.deleted_at IS NULL
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificação (rodar após o COMMIT):
-- SELECT r.name, array_agg(p.code ORDER BY p.code)
-- FROM roles r
-- JOIN role_permissions rp ON rp.role_id = r.id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE r.deleted_at IS NULL
-- GROUP BY r.name
-- ORDER BY r.name;