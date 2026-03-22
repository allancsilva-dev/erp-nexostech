import { cn } from '@/lib/utils';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string | null;
  alt?: string;
}

export function Avatar({ className, name = 'Usuario', src, alt, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-xs font-semibold text-[hsl(var(--foreground))]',
        className,
      )}
      aria-label={alt ?? `Avatar de ${name}`}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? name} className="h-full w-full object-cover" />
      ) : (
        <span>{initialsFromName(name)}</span>
      )}
    </div>
  );
}
