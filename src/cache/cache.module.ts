import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheFactory } from './cache.factory';
import { CacheConfig, getCacheConfig } from './cache.config';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const cacheConfig = getCacheConfig();
        return {
          ttl: cacheConfig.ttl * 1000,
          max: 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: 'CACHE_CONFIG',
      useFactory: (): CacheConfig => {
        const config = getCacheConfig();
        console.log(`🗃️  Cache configurado como: ${config.type.toUpperCase()}`);
        return config;
      },
    },
    CacheFactory,
    {
      provide: 'CACHE_PROVIDER',
      useFactory: (factory: CacheFactory, config: CacheConfig) => {
        return factory.createCacheProvider(config);
      },
      inject: [CacheFactory, 'CACHE_CONFIG'],
    },
  ],
  exports: ['CACHE_PROVIDER', CacheFactory],
})
export class CacheModule {}
