'use client';

import { useBranchContext } from '@/providers/branch-provider';

export function useBranch() {
  return useBranchContext();
}
