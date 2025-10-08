import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/validation';
import { HttpModule } from '@nestjs/axios';
import { CepModule } from './cep/cep.module';
import { HealthModule } from './health/health.module';
import { CacheModule as CacheOtherProviders } from './cache/cache.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    CepModule,
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('httpTimeoutMs', 2000),
        maxRedirects: 0,
      }),
    }),
    CacheOtherProviders,
    HealthModule,
    CacheModule.register({
      max: 1000,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
