import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        success:
          'border-[hsl(var(--success))]/40 bg-[hsl(var(--success-muted))] text-[hsl(var(--success-foreground))]',
        danger:
          'border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]',
        warning:
          'border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning-muted))] text-[hsl(var(--warning-foreground))]',
        info:
          'border-[hsl(var(--info))]/40 bg-[hsl(var(--info-muted))] text-[hsl(var(--info-foreground))]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
