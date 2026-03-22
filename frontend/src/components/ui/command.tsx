'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Command({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-2', className)} {...props} />;
}
export function CommandInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-9 w-full rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]" {...props} />;
}
export function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-2 max-h-48 overflow-auto', className)} {...props} />;
}
