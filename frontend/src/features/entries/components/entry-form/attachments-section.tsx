'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/shared/file-upload';

export function AttachmentsSection() {
  const [attachment, setAttachment] = useState<File | null>(null);

  return (
    <div className="space-y-2">
      <FileUpload onChange={(file) => setAttachment(file)} />
      {attachment ? <p className="text-xs text-slate-500">Anexo selecionado: {attachment.name}</p> : null}
    </div>
  );
}
