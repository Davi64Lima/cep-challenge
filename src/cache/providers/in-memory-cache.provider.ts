import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';
import { ICacheProvider } from '../interfaces/cache-provider.interface';
import { defaultCacheConfig as config } from '../cache.config';

@Injectable()
export class InMemoryCacheProvider implements ICacheProvider {
  private readonly logger = new Logger(InMemoryCacheProvider.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get(key: string): Promise<any> {
    try {
      const value = await this.cacheManager.get(key);

      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.cacheManager.set(key, value, config.ttl * 1000);
      this.logger.debug(`Cache SET: ${key} (TTL: ${config.ttl}s)`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.log('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }
}
