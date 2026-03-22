import * as Sentry from '@sentry/browser';

let initialized = false;

export function initSentry(): void {
  if (initialized || process.env.NODE_ENV !== 'production') {
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
  });

  initialized = true;
}

export function captureError(error: unknown): void {
  initSentry();
  Sentry.captureException(error);
}
