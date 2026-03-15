import type { Metadata } from 'next';
import { Sora, IBM_Plex_Mono } from 'next/font/google';
import { AppShell } from '@/components/layout/app-shell';
import { Providers } from './providers';
import './globals.css';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  title: 'Nexos ERP - Modulo Financeiro',
  description: 'Nexos ERP financeiro com dashboard, contas e configuracoes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${ibmPlexMono.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
