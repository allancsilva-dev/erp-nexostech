import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { decodeToken } from '@/lib/jwt';
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { BranchProvider } from '@/providers/branch-provider';
import { ToastProvider } from '@/providers/toast-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Nexos Financeiro',
  description: 'Modulo Financeiro do Nexos ERP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  const user = token ? decodeToken(token) : null;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <NuqsAdapter>
              <AuthProvider initialUser={user}>
                <BranchProvider>
                  <AppShell>{children}</AppShell>
                  <ToastProvider />
                </BranchProvider>
              </AuthProvider>
            </NuqsAdapter>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
