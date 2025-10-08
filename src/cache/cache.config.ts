import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface CacheConfig {
  type: 'memory' | 'redis';
  memory?: { cache: typeof CACHE_MANAGER };
  ttl: number; // Time to live in seconds
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    url?: string;
  };
}

export const defaultCacheConfig: CacheConfig = {
  type: (process.env.CACHE_TYPE as 'memory' | 'redis') || 'memory',
  memory: { cache: CACHE_MANAGER },
  ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    url:
      process.env.REDIS_URL ||
      `'redis://${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}'`,
  },
};
