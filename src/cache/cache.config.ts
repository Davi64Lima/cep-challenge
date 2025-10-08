import { CACHE_MANAGER } from '@nestjs/cache-manager';

export interface CacheConfig {
  type: 'memory' | 'redis';
  memory?: { cache: typeof CACHE_MANAGER };
  ttl: number;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    url?: string;
  };
}

export const getCacheConfig = (): CacheConfig => {
  const type = (process.env.CACHE_PROVIDER as 'memory' | 'redis') || 'memory';

  return {
    type,
    memory: { cache: CACHE_MANAGER },
    ttl: parseInt(process.env.CACHE_TTL_SECONDS || '300'),
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      url:
        process.env.REDIS_URL ||
        `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
    },
  };
};

// Manter para compatibilidade
export const defaultCacheConfig = getCacheConfig();
