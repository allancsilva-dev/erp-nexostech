import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';
export const IDEMPOTENT_TTL_MS = 24 * 60 * 60 * 1000;

export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
