'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useCancelEntry } from '@/features/entries/hooks/use-entries';

export function CancelModal({ entryId }: { entryId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const cancelEntry = useCancelEntry();

  function handleCancel(): void {
    cancelEntry.mutate(
      { entryId, reason },
      {
        onSuccess: () => {
          setOpen(false);
          setReason('');
        },
      },
    );
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>Cancelar</Button>
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Motivo do cancelamento</label>
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Obrigatorio" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={cancelEntry.isPending || reason.trim().length < 3}
                onClick={handleCancel}
              >
                {cancelEntry.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
