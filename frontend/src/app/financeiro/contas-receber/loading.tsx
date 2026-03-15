import { TableSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return <TableSkeleton rows={10} cols={7} />;
}
