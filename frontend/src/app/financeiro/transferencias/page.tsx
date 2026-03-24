"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { TransferForm } from '@/features/transfers/components/transfer-form';
import { useTransfers } from '@/features/transfers/hooks/use-transfers';
import { useBankAccounts } from '@/features/settings/hooks/use-bank-accounts';
import { TransferActions } from '@/features/transfers/components/transfer-actions';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { ErrorBanner } from '@/components/shared/error-banner';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function TransferenciasPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountId, setAccountId] = useState('');

  const transfers = useTransfers({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    accountId: accountId || undefined,
  });

  const bankAccounts = useBankAccounts();

  const transferList = Array.isArray(transfers.data?.data) ? transfers.data?.data : [];
  const accountList = Array.isArray(bankAccounts.data?.data) ? bankAccounts.data?.data : [];

  return (
    <div>
      <PageHeader title="Transferências" subtitle="Entre contas da mesma filial" />
      <div className="mb-4 surface-card p-5">
        <TransferForm />
      </div>

      <div className="mb-4 surface-card p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide">
            Data inicial
            <Input type="date" className="mt-1" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide">
            Data final
            <Input type="date" className="mt-1" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide">
            Conta
            <Select className="mt-1" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">Todas</option>
              {accountList.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name ?? account.id}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      <div className="surface-card p-5">
        {transfers.isLoading ? <TableSkeleton rows={8} cols={6} /> : null}
        {transfers.isError ? <ErrorBanner message={transfers.error.message} onRetry={() => transfers.refetch()} /> : null}

        {!transfers.isLoading && !transfers.isError && transferList.length === 0 ? (
          <EmptyState title="Nenhuma transferência encontrada" description="Não há transferências para os filtros aplicados." />
        ) : null}

        {!transfers.isLoading && !transfers.isError && transferList.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left" style={{ background: 'var(--bg-surface-raised)' }}>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Origem</th>
                  <th className="px-3 py-2 font-medium">Destino</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transferList.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-3 py-2">{item.transferDate}</td>
                    <td className="px-3 py-2">{item.fromAccountId}</td>
                    <td className="px-3 py-2">{item.toAccountId}</td>
                    <td className="px-3 py-2 font-semibold">{item.amount}</td>
                    <td className="px-3 py-2">{item.description ?? '-'}</td>
                    <td className="px-3 py-2">
                      <TransferActions
                        transferId={item.id}
                        amount={item.amount}
                        fromAccount={item.fromAccountId}
                        toAccount={item.toAccountId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
