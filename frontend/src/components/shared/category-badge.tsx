import { Badge } from '@/components/ui/badge';

export function CategoryBadge({ name, color }: { name: string; color?: string }) {
  return <Badge className="text-slate-800" style={{ backgroundColor: color ?? '#E2E8F0' }}>{name}</Badge>;
}
