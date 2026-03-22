import { PageHeader } from '@/components/layout/page-header';
import { AuditLogTable } from '@/features/audit/components/audit-log-table';

export default function AuditoriaPage() {
  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Logs de alteracao no modulo financeiro" />
      <div className="surface-card p-5">
        <AuditLogTable />
      </div>
    </div>
  );
}
