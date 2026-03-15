import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function safeJsonStringify(value: Record<string, unknown>): string {
  const sortedKeys = Object.keys(value).sort();
  return JSON.stringify(value, sortedKeys);
}
