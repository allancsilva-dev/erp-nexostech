import { TableSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return <TableSkeleton rows={8} cols={5} />;
}
