import type { Metadata } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AppShell } from '@/components/layout/app-shell';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { BranchProvider } from '@/providers/branch-provider';
import { PermissionProvider } from '@/providers/permission-provider';
import { ToastProvider } from '@/providers/toast-provider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Nexos Financeiro',
  description: 'Modulo Financeiro do Nexos ERP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <NuqsAdapter>
              <AuthProvider>
                <PermissionProvider>
                  <BranchProvider>
                    <AppShell>{children}</AppShell>
                    <ToastProvider />
                  </BranchProvider>
                </PermissionProvider>
              </AuthProvider>
            </NuqsAdapter>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
