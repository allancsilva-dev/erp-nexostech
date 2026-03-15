'use client';

import { Button } from '@/components/ui/button';

export function BatchPayBar({
  selectedCount,
  onPay,
}: {
  selectedCount: number;
  onPay: () => void;
}) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border bg-white p-3 shadow dark:bg-slate-800">
      <span className="text-sm">{selectedCount} lancamentos selecionados</span>
      <Button onClick={onPay}>Pagar selecionados</Button>
    </div>
  );
}
