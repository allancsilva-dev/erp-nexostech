import { ErrorState } from '@/components/ui/states';

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <ErrorState message={message} onRetry={onRetry} />;
}
