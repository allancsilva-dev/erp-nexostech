import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

@Injectable()
export class CacheService {
  private readonly keyv: Keyv;

  constructor(configService: ConfigService) {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL');
    this.keyv = new Keyv({ store: new KeyvRedis(redisUrl) });
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
}
