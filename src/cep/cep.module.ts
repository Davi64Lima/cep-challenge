import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CepController } from './cep.controller';
import { CepService } from './cep.service';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { ProviderSelectorService } from './providers/providerSelector';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [CepController],
  providers: [
    CepService,
    ViaCepProvider,
    BrasilApiProvider,
    ProviderSelectorService,
  ],
})
export class CepModule {}
