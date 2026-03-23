'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';
import { useEmailTemplates } from '@/features/collection-rules/hooks/use-collection-rules';
import { TemplatePreview } from '@/features/collection-rules/components/template-preview';

export function TemplateEditor() {
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();
  const templates = useEmailTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const templateList = useMemo(() => (Array.isArray(templates.data?.data) ? templates.data?.data : []), [templates.data?.data]);

  function loadTemplate(templateId: string): void {
    setSelectedTemplateId(templateId);
    const template = templateList.find((item) => item.id === templateId);
    if (!template) {
      setName('');
      setSubject('');
      setBodyHtml('');
      setBodyText('');
      return;
    }

    setName(template.name ?? '');
    setSubject(template.subject ?? '');
    setBodyHtml(template.bodyHtml ?? '');
    setBodyText(template.bodyText ?? '');
  }

  async function handleSave(): Promise<void> {
    if (!selectedTemplateId) {
      toast.error('Selecione um template para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/email-templates/${selectedTemplateId}`, {
        name,
        subject,
        bodyHtml,
        bodyText,
      });
      await queryClient.invalidateQueries({ queryKey: ['email-templates', activeBranchId || 'default'] });
      toast.success('Template salvo com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar template.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4 dark:bg-slate-800">
      <select
        className="h-10 rounded-md border px-3 text-sm"
        value={selectedTemplateId}
        onChange={(event) => loadTemplate(event.target.value)}
      >
        <option value="">Selecione um template</option>
        {templateList.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>

      <Input placeholder="Nome do template" value={name} onChange={(event) => setName(event.target.value)} />
      <Input placeholder="Assunto do e-mail" value={subject} onChange={(event) => setSubject(event.target.value)} />
      <textarea
        className="min-h-40 w-full rounded-md border border-slate-300 p-3 text-sm"
        placeholder="HTML do template com variaveis"
        value={bodyHtml}
        onChange={(event) => setBodyHtml(event.target.value)}
      />

      <textarea
        className="min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm"
        placeholder="Texto plano do template"
        value={bodyText}
        onChange={(event) => setBodyText(event.target.value)}
      />

      <div className="flex gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={isSaving || !selectedTemplateId}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
        {selectedTemplateId ? <TemplatePreview templateId={selectedTemplateId} /> : null}
      </div>
    </div>
  );
}
