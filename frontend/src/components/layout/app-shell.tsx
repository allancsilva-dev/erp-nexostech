'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BranchSwitcher } from './branch-switcher';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/financeiro/contas-pagar', label: 'Contas a Pagar' },
  { href: '/financeiro/configuracoes', label: 'Configuracoes' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f6f2dc_0%,_#e7ecd6_45%,_#edf0e4_100%)] text-[#272c20]">
      <header className="border-b border-[#d5d9ca] bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5b604c]">Nexos ERP</p>
            <h1 className="text-lg font-semibold">Modulo Financeiro</h1>
          </div>

          <div className="flex items-center gap-3">
            <BranchSwitcher />
            <div className="rounded-xl bg-[#2f3b2f] px-3 py-2 text-xs font-semibold text-white">ADMIN</div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-[#d2d7c8] bg-white p-3">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-[#313f32] text-white' : 'text-[#374032] hover:bg-[#eef1e5]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
