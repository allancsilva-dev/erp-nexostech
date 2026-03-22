import { LoadingState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return <LoadingState type="table" rows={Math.max(rows, Math.ceil((rows * cols) / 6))} />;
}

export function CardSkeleton() {
  return <Skeleton className="h-28" />;
}

export function FormSkeleton() {
  return <LoadingState type="form" />;
}
