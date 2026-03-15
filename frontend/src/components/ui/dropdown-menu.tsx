'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function DropdownMenu({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative inline-block', className)} {...props} />;
}
export function DropdownMenuContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-44 rounded-md border bg-white p-1 shadow', className)} {...props} />;
}
export function DropdownMenuItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn('block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100', className)} {...props} />;
}
