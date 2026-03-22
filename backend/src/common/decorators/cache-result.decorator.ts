import { CacheService } from '../../infrastructure/cache/cache.service';

type CacheResultOptions = {
  keyPrefix: string;
  ttlSeconds: number;
};

const LOCK_TTL_MS = 5_000; // lock expira em 5s (evita deadlock)
const RETRY_INTERVAL_MS = 50; // polling enquanto lock está ativo
const MAX_RETRIES = 60; // máx 3s de espera (60 × 50ms)

/** Jitter: ±10% do TTL para evitar thundering herd no expiry */
function withJitter(ttlSeconds: number): number {
  const jitter = ttlSeconds * 0.1 * (Math.random() * 2 - 1);
  return Math.max(1, ttlSeconds + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CacheResult(options: CacheResultOptions) {
  return (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const original = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = async function wrapped(
      this: unknown,
      ...args: unknown[]
    ) {
      const self = this as { cacheService?: CacheService };
      const cache = self.cacheService;
      if (!cache) {
        return Promise.resolve(original.apply(this, args) as unknown);
      }

      const cacheKey = `${options.keyPrefix}:${JSON.stringify(args)}`;

      // 1. Cache hit — caminho feliz
      const cached = await cache.get<unknown>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // 2. Tenta adquirir lock (SETNX atômico)
      const acquired = await cache.acquireLock(cacheKey, LOCK_TTL_MS);

      if (acquired) {
        try {
          // Double-check: outro processo pode ter populado enquanto aguardávamos
          const recheck = await cache.get<unknown>(cacheKey);
          if (recheck !== undefined) {
            return recheck;
          }

          const result = await Promise.resolve(
            original.apply(this, args) as unknown,
          );
          const ttlWithJitter = withJitter(options.ttlSeconds);
          await cache.set(cacheKey, result, ttlWithJitter * 1000);
          return result;
        } finally {
          await cache.releaseLock(cacheKey);
        }
      }

      // 3. Outro processo detém o lock — aguarda com retry
      for (let i = 0; i < MAX_RETRIES; i++) {
        await sleep(RETRY_INTERVAL_MS);
        const waited = await cache.get<unknown>(cacheKey);
        if (waited !== undefined) {
          return waited;
        }
      }

      // 4. Fallback: computa diretamente se lock expirou sem resultado
      return Promise.resolve(original.apply(this, args) as unknown);
    };

    return descriptor;
  };
}
