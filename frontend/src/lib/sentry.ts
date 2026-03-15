export function initSentry(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Placeholder para configuracao do Sentry em producao.
  // Exemplo futuro: Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0.1 });
}
