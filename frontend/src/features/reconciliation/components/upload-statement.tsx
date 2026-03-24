'use client';

import { FileUpload } from '@/components/shared/file-upload';

export function UploadStatement() {
  return (
    <div className="surface-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Upload de extrato (OFX/CSV)</h3>
      <FileUpload onChange={() => undefined} />
    </div>
  );
}
