'use client';

import { Button } from '@/components/ui/button';

export function MatchActions() {
  return (
    <div className="flex gap-2">
      <Button size="sm">Confirmar match</Button>
      <Button variant="outline" size="sm">Rejeitar</Button>
      <Button variant="secondary" size="sm">Criar lancamento</Button>
    </div>
  );
}
