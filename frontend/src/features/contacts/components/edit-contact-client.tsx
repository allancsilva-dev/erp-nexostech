'use client';

import { ContactForm } from './contact-form';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { ErrorBanner } from '@/components/shared/error-banner';
import { useContact } from '@/features/contacts/hooks/use-contacts';

export function EditContactClient({ id }: { id: string }) {
  const contactQuery = useContact(id);

  if (contactQuery.isLoading) {
    return <TableSkeleton rows={6} cols={2} />;
  }

  if (contactQuery.isError) {
    return <ErrorBanner message={contactQuery.error?.message ?? 'Falha ao carregar contato.'} onRetry={() => void contactQuery.refetch()} />;
  }

  const contact = contactQuery.data?.data ?? null;

  return (
    <div>
      {contact ? (
        <ContactForm initialValues={contact} onSaved={() => void contactQuery.refetch()} />
      ) : (
        <div className="p-4 text-sm text-slate-600">Contato não encontrado.</div>
      )}
    </div>
  );
}

export default EditContactClient;
