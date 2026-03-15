'use client';

import { FileUpload } from '@/components/shared/file-upload';

export function UploadStatement() {
  return (
    <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
      <h3 className="mb-2 text-sm font-semibold">Upload de extrato (OFX/CSV)</h3>
      <FileUpload onChange={() => undefined} />
    </div>
  );
}
