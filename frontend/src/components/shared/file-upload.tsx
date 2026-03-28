'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useBranch } from '@/hooks/use-branch';

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];

interface PresignPayload {
  uploadUrl: string;
  storageKey: string;
}

type UploadStep =
  | 'idle'
  | 'requesting-url'
  | 'uploading'
  | 'registering'
  | 'done'
  | 'error';

function uploadWithProgress(file: File, uploadUrl: string, onProgress: (value: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error('Falha no upload')); 
      }
    };
    xhr.onerror = () => reject(new Error('Falha de rede no upload'));
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

async function retryUpload(file: File, uploadUrl: string, onProgress: (value: number) => void): Promise<void> {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      await uploadWithProgress(file, uploadUrl, onProgress);
      return;
    } catch (error) {
      if (attempt === delays.length) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

export function FileUpload({
  entryId,
  onChange,
}: {
  entryId?: string;
  onChange: (file: File | null, storageKey?: string) => void;
}) {
  const queryClient = useQueryClient();
  const { activeBranchId } = useBranch();

  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<UploadStep>('idle');
  const currentFile = useRef<File | null>(null);

  const isUploading = step === 'requesting-url' || step === 'uploading' || step === 'registering';

  async function startUpload(file: File): Promise<void> {
    if (!entryId) {
      setError('Não é possível anexar sem um lançamento válido.');
      setStep('error');
      onChange(null);
      return;
    }

    setError('');
    setProgress(0);
    setStep('requesting-url');

    try {
      const presign = await api.post<PresignPayload>('/attachments/presign', {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        entryId,
      });

      setStep('uploading');
      await retryUpload(file, presign.data.uploadUrl, setProgress);

      setStep('registering');
      await api.post('/attachments', {
        entryId,
        storageKey: presign.data.storageKey,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      if (activeBranchId) {
        void queryClient.invalidateQueries({
          queryKey: ['entries', entryId, 'attachments', activeBranchId],
        });
      }

      setFileName(file.name);
      setStep('done');
      onChange(file, presign.data.storageKey);
    } catch (uploadError) {
      const message = uploadError instanceof Error
        ? uploadError.message
        : 'Erro no upload';

      if (step === 'registering') {
        setError(`Arquivo enviado para storage, mas nao foi registrado no banco: ${message}`);
      } else {
        setError(message);
      }

      setStep('error');
      onChange(null);
    }
  }

  return (
    <div
      className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors"
      style={{
        borderColor: 'var(--border-default)',
        background: 'var(--bg-surface)',
      }}
    >
      <label className="flex cursor-pointer flex-col items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Upload className="h-5 w-5" />
        <span>Arraste ou clique para anexar (PDF, JPG, PNG ate 10MB)</span>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            currentFile.current = file;
            if (!file) {
              setFileName('');
              setProgress(0);
              setError('');
              setStep('idle');
              onChange(null);
              return;
            }
            if (!ALLOWED.includes(file.type) || file.size > 10 * 1024 * 1024) {
              setFileName('Arquivo inválido');
              setError('Arquivo inválido. Aceito: PDF/JPG/PNG até 10MB.');
              setStep('error');
              onChange(null);
              return;
            }
            void startUpload(file);
          }}
        />
      </label>

      {isUploading ? (
        <div className="mt-3 space-y-2">
          {step === 'requesting-url' ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Preparando upload...</p>
          ) : null}

          <div className="h-2 w-full overflow-hidden rounded" style={{ background: 'var(--bg-surface-raised)' }}>
            <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'var(--accent)' }} />
          </div>

          {step === 'uploading' ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload em andamento: {progress}%</p>
          ) : null}

          {step === 'registering' ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Registrando arquivo...</p>
          ) : null}
        </div>
      ) : null}

      {fileName ? <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{fileName}</p> : null}
      {error ? <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <div className="mt-2 flex gap-2">
        {error && currentFile.current ? (
          <Button
            className="mt-1"
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentFile.current) {
                void startUpload(currentFile.current);
              }
            }}
          >
            Tentar novamente
          </Button>
        ) : null}

        {fileName ? (
          <Button
            className="mt-1"
            variant="outline"
            size="sm"
            onClick={() => {
              setFileName('');
              setProgress(0);
              setError('');
              setStep('idle');
              currentFile.current = null;
              onChange(null);
            }}
          >
            Remover
          </Button>
        ) : null}
      </div>
    </div>
  );
}
