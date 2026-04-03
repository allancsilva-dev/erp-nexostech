'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { showUnknownError } from '@/components/ui/error-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api-client';
import { useBranch } from '@/hooks/use-branch';

export function TransferActions({
  transferId,
  amount,
  fromAccount,
  toAccount,
}: {
  transferId: string;
  amount: string;
  fromAccount: string;
  toAccount: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAdmin } = usePermissions();
  const { activeBranchId } = useBranch();
  const queryClient = useQueryClient();

  if (!isAdmin) {
    return null;
  }

  async function handleReverse(): Promise<void> {
    const approved = window.confirm(
      `Estornar transferencia de R$ ${amount} de ${fromAccount} para ${toAccount}?`,
    );

    if (!approved) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/transfers/${transferId}`);
      await queryClient.invalidateQueries({ queryKey: ['transfers', activeBranchId || 'default'] });
      toast.success('Transferencia estornada com sucesso.');
    } catch (error) {
      showUnknownError(error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void handleReverse()} disabled={isDeleting}>
      {isDeleting ? 'Estornando...' : 'Estornar'}
    </Button>
  );
}
