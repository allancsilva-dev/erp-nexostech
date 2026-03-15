import type { EntryStatus } from '@/features/entries/types/entry.types';
import { STATUS_CONFIG } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: EntryStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.color}>{config.label}</Badge>;
}
