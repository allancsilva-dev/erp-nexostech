'use client';

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/states';
import { MoneyDisplay } from '@/components/shared/money-display';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/lib/constants';
import type { OverdueItem } from '@/features/dashboard/hooks/use-dashboard';

function OverdueListComponent({ items }: { items: OverdueItem[] }) {
  const pageSize = 8;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  if (items.length === 0) {
    return (
      <Card>
        <CardTitle>Vencidas</CardTitle>
        <CardContent>
          <EmptyState title="Nenhuma conta vencida" description="A filial ativa nao possui pendencias vencidas." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>Vencidas</CardTitle>
        <Link className="text-sm text-[var(--info)]" href={ROUTES.contasPagar}>Ver todas</Link>
      </div>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.documentNumber}</TableCell>
                <TableCell className="truncate">{item.description}</TableCell>
                <TableCell className="truncate">{item.contactName || '-'}</TableCell>
                <TableCell>{formatDate(item.dueDate)}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay value={item.amount} className="text-right" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            aria-label="Pagina anterior de vencidas"
          >
            Anterior
          </Button>
          <span className="text-xs text-[var(--text-muted)]">
            Pagina {page} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            aria-label="Proxima pagina de vencidas"
          >
            Proxima
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const OverdueList = memo(OverdueListComponent);
