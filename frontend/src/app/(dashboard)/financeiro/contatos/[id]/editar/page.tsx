import { PageHeader } from '@/components/layout/page-header';
import EditContactClient from '@/features/contacts/components/edit-contact-client';

type Props = { params: { id: string } };

export default function EditarContatoPage({ params }: Props) {
  const { id } = params;

  return (
    <div className="space-y-6">
      <PageHeader title="Editar Contato" subtitle="Editar dados do contato" />

      <div className="surface-card p-4">
        <EditContactClient id={id} />
      </div>
    </div>
  );
}
