'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Command({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-md border bg-white p-2', className)} {...props} />;
}
export function CommandInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-9 w-full rounded border border-slate-300 px-3 text-sm" {...props} />;
}
export function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-2 max-h-48 overflow-auto', className)} {...props} />;
}
