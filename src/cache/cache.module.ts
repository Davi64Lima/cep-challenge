import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheFactory } from './cache.factory';
import { CacheConfig, defaultCacheConfig } from './cache.config';

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      ttl: defaultCacheConfig.ttl * 1000, // Convert to milliseconds
      max: 1000, // Maximum number of items in cache
    }),
  ],
  providers: [
    {
      provide: 'CACHE_CONFIG',
      useValue: defaultCacheConfig,
    },
    CacheFactory,
    {
      provide: 'CACHE_PROVIDER',
      useFactory: (factory: CacheFactory, config: CacheConfig) =>
        factory.createCacheProvider(config),
      inject: [CacheFactory, 'CACHE_CONFIG'],
    },
  ],
  exports: ['CACHE_PROVIDER', CacheFactory],
})
export class CacheModule {}
