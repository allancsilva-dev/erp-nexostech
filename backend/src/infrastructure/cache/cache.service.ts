import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

@Injectable()
export class CacheService {
  private readonly keyv: Keyv;
  private readonly redis: RedisClientType;
  private connected = false;

  constructor(configService: ConfigService) {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');
    this.keyv = new Keyv({ store: new KeyvRedis(redisUrl) });
    this.redis = createClient({ url: redisUrl }) as RedisClientType;
    void this.redis.connect().then(() => {
      this.connected = true;
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.keyv.get(key) as Promise<T | undefined>;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<boolean> {
    await this.keyv.set(key, value, ttlMs);
    return true;
  }

  async del(key: string): Promise<boolean> {
    return this.keyv.delete(key);
  }

  /**
   * Tenta adquirir um lock com SET NX PX (atômico).
   * Retorna true se adquiriu, false se já existe.
   */
  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    if (!this.connected) return false;
    const result = await this.redis.set(`lock:${key}`, '1', {
      NX: true,
      PX: ttlMs,
    });
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    if (!this.connected) return;
    await this.redis.del(`lock:${key}`);
  }
}
