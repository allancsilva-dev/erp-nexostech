import { PageHeader } from '@/components/layout/page-header';
import { AuditLogTable } from '@/features/audit/components/audit-log-table';

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" subtitle="Logs de alteracao no modulo financeiro" />
      <AuditLogTable />
    </div>
  );
}
