import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/validation';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { HealthController } from './health/health.controller';
import { CepModule } from './cep/cep.module';

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
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('cacheTtlSec', 900) * 1000, // ms
        isGlobal: true,
      }),
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
