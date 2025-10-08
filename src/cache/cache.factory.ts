import { Injectable, Inject } from '@nestjs/common';
import { ICacheProvider } from './interfaces/cache-provider.interface';
import { Cache } from '@nestjs/cache-manager';
import { InMemoryCacheProvider } from './providers/in-memory-cache.provider';
import { RedisCacheProvider } from './providers/redis-cache.provider';
import { CacheConfig } from './cache.config';

@Injectable()
export class CacheFactory {
  constructor(@Inject('CACHE_MANAGER') private readonly cacheManager: Cache) {}

  createCacheProvider(config: CacheConfig): ICacheProvider {
    switch (config.type) {
      case 'redis':
        return new RedisCacheProvider(config);
      case 'memory':
      default:
        return new InMemoryCacheProvider(this.cacheManager);
    }
  }
}
