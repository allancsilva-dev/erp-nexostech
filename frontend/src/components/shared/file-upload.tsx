'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];

export function FileUpload({ onChange }: { onChange: (file: File | null) => void }) {
  const [fileName, setFileName] = useState<string>('');

  return (
    <div className="rounded-xl border border-dashed p-4">
      <label className="flex cursor-pointer flex-col items-center gap-2 text-sm text-slate-600">
        <Upload className="h-5 w-5" />
        <span>Arraste ou clique para anexar (PDF, JPG, PNG ate 10MB)</span>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file) {
              setFileName('');
              onChange(null);
              return;
            }
            if (!ALLOWED.includes(file.type) || file.size > 10 * 1024 * 1024) {
              setFileName('Arquivo invalido');
              onChange(null);
              return;
            }
            setFileName(file.name);
            onChange(file);
          }}
        />
      </label>
      {fileName ? <p className="mt-2 text-xs text-slate-500">{fileName}</p> : null}
      {fileName ? <Button className="mt-2" variant="outline" size="sm" onClick={() => { setFileName(''); onChange(null); }}>Remover</Button> : null}
    </div>
  );
}
