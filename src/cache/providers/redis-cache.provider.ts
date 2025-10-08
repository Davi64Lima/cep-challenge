import { createClient, RedisClientType } from 'redis';
import { ICacheProvider } from '../interfaces/cache-provider.interface';
import { Injectable } from '@nestjs/common';
import { CacheConfig } from '../cache.config';

@Injectable()
export class RedisCacheProvider implements ICacheProvider {
  private client: RedisClientType;

  constructor(config: CacheConfig) {
    this.client = createClient({
      url: config.redis?.url || 'redis://localhost:6379',
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.client.flushDb();
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
