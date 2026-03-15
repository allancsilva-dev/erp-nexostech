'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/sentry';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    captureError(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold">Algo deu errado</h2>
        <p className="mt-2 text-sm text-slate-600">Um erro inesperado ocorreu.</p>
        <button
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          onClick={reset}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
