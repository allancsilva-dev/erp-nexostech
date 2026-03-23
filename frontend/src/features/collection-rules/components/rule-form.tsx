'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCollectionRules, useEmailTemplates } from '@/features/collection-rules/hooks/use-collection-rules';

type EventType = 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE' | 'ON_PAYMENT';

const EVENT_OPTIONS: EventType[] = ['BEFORE_DUE', 'ON_DUE', 'AFTER_DUE', 'ON_PAYMENT'];

export function RuleForm() {
  const rules = useCollectionRules();
  const templates = useEmailTemplates();

  const [editId, setEditId] = useState<string | null>(null);
  const [event, setEvent] = useState<EventType>('BEFORE_DUE');
  const [daysOffset, setDaysOffset] = useState('-7');
  const [emailTemplateId, setEmailTemplateId] = useState('');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ruleList = useMemo(() => (Array.isArray(rules.data?.data) ? rules.data?.data : []), [rules.data?.data]);
  const templateList = useMemo(() => (Array.isArray(templates.data?.data) ? templates.data?.data : []), [templates.data?.data]);

  async function handleSubmit(): Promise<void> {
    if (!emailTemplateId) {
      toast.error('Selecione um template de e-mail.');
      return;
    }

    setIsSubmitting(true);
    try {
      await rules.saveRule({
        id: editId,
        payload: {
          event,
          daysOffset: Number(daysOffset),
          emailTemplateId,
          active,
          sortOrder: Number(sortOrder),
        },
      });
      toast.success(editId ? 'Regra atualizada.' : 'Regra criada.');
      setEditId(null);
      setEvent('BEFORE_DUE');
      setDaysOffset('-7');
      setEmailTemplateId('');
      setActive(true);
      setSortOrder('0');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar regra.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 dark:bg-slate-800">
      <h3 className="text-sm font-semibold">Criar / editar regra</h3>

      <div className="grid gap-3 md:grid-cols-5">
        <select className="h-10 rounded-md border px-3 text-sm" value={event} onChange={(eventValue) => setEvent(eventValue.target.value as EventType)}>
          {EVENT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <input
          className="h-10 rounded-md border px-3 text-sm"
          value={daysOffset}
          onChange={(eventValue) => setDaysOffset(eventValue.target.value)}
          placeholder="daysOffset"
        />

        <select className="h-10 rounded-md border px-3 text-sm" value={emailTemplateId} onChange={(eventValue) => setEmailTemplateId(eventValue.target.value)}>
          <option value="">Template</option>
          {templateList.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <input
          className="h-10 rounded-md border px-3 text-sm"
          value={sortOrder}
          onChange={(eventValue) => setSortOrder(eventValue.target.value)}
          placeholder="sortOrder"
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(eventValue) => setActive(eventValue.target.checked)} />
          Ativa
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : editId ? 'Salvar alteracoes' : 'Criar regra'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left dark:bg-slate-900/60">
              <th className="px-3 py-2 font-medium">Evento</th>
              <th className="px-3 py-2 font-medium">Offset</th>
              <th className="px-3 py-2 font-medium">Template</th>
              <th className="px-3 py-2 font-medium">Ativa</th>
              <th className="px-3 py-2 font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {ruleList.map((rule) => (
              <tr key={rule.id} className="border-b">
                <td className="px-3 py-2">{rule.event}</td>
                <td className="px-3 py-2">{rule.daysOffset}</td>
                <td className="px-3 py-2">{templateList.find((template) => template.id === rule.emailTemplateId)?.name ?? rule.emailTemplateId}</td>
                <td className="px-3 py-2">{rule.active ? 'Sim' : 'Nao'}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditId(rule.id);
                      setEvent(rule.event);
                      setDaysOffset(String(rule.daysOffset));
                      setEmailTemplateId(rule.emailTemplateId);
                      setActive(rule.active);
                      setSortOrder(String(rule.sortOrder));
                    }}
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
