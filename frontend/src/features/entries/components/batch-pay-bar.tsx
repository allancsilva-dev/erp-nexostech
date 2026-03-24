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
    <div className="surface-card sticky bottom-4 z-20 flex items-center justify-between p-3 shadow">
      <span className="text-sm">{selectedCount} lancamentos selecionados</span>
      <Button onClick={onPay}>Pagar selecionados</Button>
    </div>
  );
}
