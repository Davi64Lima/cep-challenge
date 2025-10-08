import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AddressResponseDto } from '../common/dto/address-response.dto';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import {
  ProviderSelectorService,
  ProviderWithWeight,
} from './providers/providerSelector';
import { CepException } from './err/cep-exception';
import { ErrorCode } from '../common/dto/error-response.dto';
import { ICepProvider } from './interfaces/cep-provider.interface';

interface ProviderError {
  provider: string;
  code: ErrorCode;
  message: string;
}

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);
  private readonly providersWithWeights: ProviderWithWeight[];
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 horas em segundos

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly viaCepProvider: ViaCepProvider,
    private readonly brasilApiProvider: BrasilApiProvider,
    private readonly providerSelector: ProviderSelectorService,
  ) {
    this.providersWithWeights = [
      { provider: this.viaCepProvider, weight: 70 },
      { provider: this.brasilApiProvider, weight: 30 },
    ];
  }

  async findAddressByCep(cep: string): Promise<AddressResponseDto> {
    const cacheKey = `cep:${cep}`;

    // 1. Tentar buscar do cache
    const cachedAddress =
      await this.cacheManager.get<AddressResponseDto>(cacheKey);
    if (cachedAddress) {
      this.logger.log(`CEP ${cep} encontrado no cache`);
      return cachedAddress;
    }

    // 2. Selecionar ordem dos providers
    const { ordered } = this.providerSelector.selectProviders(
      this.providersWithWeights,
    );

    this.logger.log(
      `Consultando CEP ${cep} - Ordem: ${ordered.map((p) => p.name).join(' → ')}`,
    );

    const errors: ProviderError[] = [];

    // 3. Tentar cada provider em ordem
    for (const provider of ordered) {
      try {
        const result = await provider.findByCep(cep);
        this.logger.log(`CEP ${cep} encontrado em ${provider.name}`);

        // 4. Gravar no cache antes de retornar
        await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
        this.logger.debug(
          `CEP ${cep} gravado no cache (TTL: ${this.CACHE_TTL}s)`,
        );

        return {
          ...result,
          source: 'viacep',
          fetched_at: new Date(),
        };
      } catch (error) {
        if (error instanceof CepException) {
          const errorResponse = error.getResponse() as any;
          const errorCode = errorResponse.code as ErrorCode;

          errors.push({
            provider: provider.name,
            code: errorCode,
            message: error.message,
          });

          this.logger.warn(
            `${provider.name} falhou: ${errorCode} - ${error.message}`,
          );

          // Continuar tentando próximo provider
          continue;
        }

        // Erro desconhecido - tratar como UPSTREAM_UNAVAILABLE
        this.logger.error(
          `Erro desconhecido em ${provider.name}: ${error.message}`,
        );
        errors.push({
          provider: provider.name,
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message: error.message,
        });
        continue;
      }
    }

    // 5. Todos os providers falharam - analisar erros e retornar código apropriado
    return this.handleAllProvidersFailed(cep, ordered, errors);
  }

  /**
   * Analisa os erros de todos os providers e retorna a exceção apropriada
   */
  private handleAllProvidersFailed(
    cep: string,
    providers: ICepProvider[],
    errors: ProviderError[],
  ): never {
    this.logger.error(
      `CEP ${cep} falhou em todos os ${providers.length} providers`,
    );

    // Verificar se todos falharam com CEP_NOT_FOUND
    const allNotFound = errors.every((e) => e.code === ErrorCode.CEP_NOT_FOUND);
    if (allNotFound) {
      throw new CepException(
        ErrorCode.CEP_NOT_FOUND,
        {
          cep,
          attempts: providers.length,
          providers: providers.map((p) => p.name),
          errors: errors.map((e) => ({
            provider: e.provider,
            code: e.code,
            message: e.message,
          })),
        },
        'CEP não encontrado em nenhum dos provedores disponíveis',
      );
    }

    // Verificar se todos falharam com GATEWAY_TIMEOUT
    const allTimeout = errors.every(
      (e) => e.code === ErrorCode.GATEWAY_TIMEOUT,
    );
    if (allTimeout) {
      throw new CepException(
        ErrorCode.GATEWAY_TIMEOUT,
        {
          cep,
          attempts: providers.length,
          providers: providers.map((p) => p.name),
          errors: errors.map((e) => ({
            provider: e.provider,
            code: e.code,
            message: e.message,
          })),
        },
        'Timeout ao consultar todos os provedores de CEP',
      );
    }

    // Verificar se há pelo menos um timeout
    const hasTimeout = errors.some((e) => e.code === ErrorCode.GATEWAY_TIMEOUT);
    if (hasTimeout) {
      throw new CepException(
        ErrorCode.GATEWAY_TIMEOUT,
        {
          cep,
          attempts: providers.length,
          providers: providers.map((p) => p.name),
          errors: errors.map((e) => ({
            provider: e.provider,
            code: e.code,
            message: e.message,
          })),
        },
        'Timeout ao consultar provedores de CEP',
      );
    }

    // Caso padrão: erros técnicos misturados (5xx, network, etc)
    throw new CepException(
      ErrorCode.UPSTREAM_UNAVAILABLE,
      {
        cep,
        attempts: providers.length,
        providers: providers.map((p) => p.name),
        errors: errors.map((e) => ({
          provider: e.provider,
          code: e.code,
          message: e.message,
        })),
      },
      'Todos os provedores de CEP estão temporariamente indisponíveis',
    );
  }
}
