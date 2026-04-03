'use client';

import { useState } from 'react';
import { showUnknownError } from '@/components/ui/error-toast';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

interface PreviewData {
  templateId: string;
  renderedSubject: string;
  renderedBody: string;
}

export function TemplatePreview({ templateId }: { templateId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  async function handlePreview(): Promise<void> {
    setIsLoading(true);
    try {
      const response = await api.post<PreviewData>(`/email-templates/${templateId}/preview`);
      setPreview(response.data);
      setIsOpen(true);
    } catch (error) {
      showUnknownError(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => void handlePreview()} disabled={isLoading}>
        {isLoading ? 'Gerando preview...' : 'Visualizar'}
      </Button>

      {isOpen && preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Preview do template</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Fechar
              </Button>
            </div>

            <p className="mb-2 text-sm font-semibold">{preview.renderedSubject}</p>
            <div
              className="max-h-[60vh] overflow-auto rounded-lg border p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: preview.renderedBody }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
