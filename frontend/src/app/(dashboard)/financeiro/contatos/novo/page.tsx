import { PageHeader } from '@/components/layout/page-header';
import ContactForm from '@/features/contacts/components/contact-form';

export default function NovoContatoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Novo Contato" subtitle="Criar contato ou fornecedor" />
      <div className="surface-card p-4">
        <ContactForm />
      </div>
    </div>
  );
}
