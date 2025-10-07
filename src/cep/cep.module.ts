import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { CepController } from './cep.controller';
import { CepService } from './cep.service';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { ProviderSelectorService } from './providers/providerSelector';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    CacheModule.register({
      ttl: 60 * 5, // 5 minutos em segundos
      max: 1000, // máximo de 1000 itens no cache
    }),
  ],
  controllers: [CepController],
  providers: [
    CepService,
    ViaCepProvider,
    BrasilApiProvider,
    ProviderSelectorService,
  ],
})
export class CepModule {}
