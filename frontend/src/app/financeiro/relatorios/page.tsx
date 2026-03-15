import Link from 'next/link';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Relatorios" subtitle="DRE, Balancete e Aging" />
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/financeiro/relatorios/dre">
          <Card>
            <CardTitle>DRE</CardTitle>
            <CardContent>Demonstrativo de resultado do exercicio.</CardContent>
          </Card>
        </Link>
        <Link href="/financeiro/relatorios/balancete">
          <Card>
            <CardTitle>Balancete</CardTitle>
            <CardContent>Saldos por categoria e periodo.</CardContent>
          </Card>
        </Link>
        <Link href="/financeiro/relatorios/aging">
          <Card>
            <CardTitle>Aging</CardTitle>
            <CardContent>Faixas de atraso por titulo.</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
