import { PageHeader } from '@/components/layout/page-header';
import { ContactsTable } from '@/features/contacts/components/contacts-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/permission-gate';

export default function ContatosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Contatos" subtitle="Listagem de contatos e fornecedores" />

      <div className="flex justify-end">
        <PermissionGate permission="contacts.manage">
          <Link href="/financeiro/contatos/novo">
            <Button>Novo Contato</Button>
          </Link>
        </PermissionGate>
      </div>

      <ContactsTable />
    </div>
  );
}
