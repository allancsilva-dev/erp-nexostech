import { CacheService } from '../../infrastructure/cache/cache.service';

type CacheResultOptions = {
  keyPrefix: string;
  ttlSeconds: number;
};

export function CacheResult(options: CacheResultOptions) {
  return (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const original = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function wrapped(this: unknown, ...args: unknown[]) {
      const self = this as { cacheService?: CacheService };
      const cache = self.cacheService;
      if (!cache) {
        return original.apply(this, args);
      }

      const cacheKey = `${options.keyPrefix}:${JSON.stringify(args)}`;
      const cached = await cache.get<unknown>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const result = await original.apply(this, args);
      await cache.set(cacheKey, result, options.ttlSeconds * 1000);
      return result;
    };

    return descriptor;
  };
}
