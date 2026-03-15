'use client';

import { Button } from '@/components/ui/button';

export function ApprovalActions() {
  return (
    <div className="flex gap-2">
      <Button size="sm">Aprovar</Button>
      <Button size="sm" variant="destructive">Rejeitar</Button>
    </div>
  );
}
