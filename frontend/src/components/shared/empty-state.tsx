import { EmptyState as UiEmptyState } from '@/components/ui/states';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return <UiEmptyState title={title} description={description} action={action} />;
}
