import { Injectable, Logger } from '@nestjs/common';
import { AddressResponseDto } from '../common/dto/address-response.dto';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import {
  ProviderSelectorService,
  ProviderWithWeight,
} from './providers/providerSelector';
import { CepException } from './err/cep-exception';
import { ErrorCode } from '../common/dto/error-response.dto';

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);
  private readonly providersWithWeights: ProviderWithWeight[];

  constructor(
    private readonly viaCepProvider: ViaCepProvider,
    private readonly brasilApiProvider: BrasilApiProvider,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    // Configuração centralizada de providers e pesos
    // Para adicionar novo provider: apenas adicione aqui!
    this.providersWithWeights = [
      { provider: this.viaCepProvider, weight: 70 },
      { provider: this.brasilApiProvider, weight: 30 },
      // { provider: this.apiCepProvider, weight: 20 }, // Exemplo de novo provider
    ];
  }

  async findAddressByCep(cep: string): Promise<AddressResponseDto> {
    const { ordered } = this.providerSelector.selectProviders(
      this.providersWithWeights,
    );

    this.logger.log(
      `Consultando CEP ${cep} - Ordem: ${ordered.map((p) => p.name).join(' → ')}`,
    );

    const errors: Array<{ provider: string; error: any }> = [];

    // Tentar cada provider em ordem
    for (const provider of ordered) {
      try {
        const result = await provider.findByCep(cep);
        this.logger.log(`CEP ${cep} encontrado em ${provider.name}`);
        return result;
      } catch (error) {
        errors.push({ provider: provider.name, error });

        if (error instanceof CepException) {
          const errorCode = (error.getResponse() as any).code;

          this.logger.warn(
            `Erro em ${provider.name}: ${errorCode} - ${error.message}`,
          );

          // Se é CEP_NOT_FOUND e ainda há providers, continuar tentando
          // Para outros erros também continuar tentando fallback
          continue;
        }

        // Erro desconhecido, continuar tentando outros providers
        this.logger.error(
          `Erro desconhecido em ${provider.name}: ${error.message}`,
        );
        continue;
      }
    }

    // Todos os providers falharam
    this.logger.error(
      `CEP ${cep} não encontrado em nenhum dos ${ordered.length} providers`,
    );

    // Analisar os erros para decidir qual código retornar
    const hasOnlyNotFound = errors.every(
      (e) =>
        e.error instanceof CepException &&
        (e.error.getResponse() as any).code === ErrorCode.CEP_NOT_FOUND,
    );

    if (hasOnlyNotFound) {
      throw new CepException(
        ErrorCode.CEP_NOT_FOUND,
        {
          cep,
          attempts: ordered.length,
          providers: ordered.map((p) => p.name),
          errors: errors.map((e) => ({
            provider: e.provider,
            message: e.error.message,
          })),
        },
        'CEP não encontrado em nenhum dos provedores disponíveis',
      );
    }

    // Se houve erros técnicos (timeout, unavailable)
    throw new CepException(
      ErrorCode.UPSTREAM_UNAVAILABLE,
      {
        cep,
        attempts: ordered.length,
        providers: ordered.map((p) => p.name),
        errors: errors.map((e) => ({
          provider: e.provider,
          code:
            e.error instanceof CepException
              ? (e.error.getResponse() as any).code
              : 'UNKNOWN',
          message: e.error.message,
        })),
      },
      'Todos os provedores de CEP estão temporariamente indisponíveis',
    );
  }
}
