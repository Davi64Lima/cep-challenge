import { Injectable, Logger } from '@nestjs/common';
import { ICepProvider } from '../interfaces/cep-provider.interface';

export interface ProviderWithWeight {
  provider: ICepProvider;
  weight: number;
}

export interface ProviderSelection {
  ordered: ICepProvider[];
}

@Injectable()
export class ProviderSelectorService {
  private readonly logger = new Logger(ProviderSelectorService.name);
  private requestCount = 0;
  private randomGenerator: () => number;

  constructor() {
    this.randomGenerator = Math.random;
  }

  /**
   * Define um gerador de números aleatórios customizado (útil para testes)
   */
  setRandomGenerator(generator: () => number): void {
    this.randomGenerator = generator;
  }

  /**
   * Seleciona e ordena providers baseado em pesos
   * Retorna lista ordenada [primário, secundário, terciário, ...]
   *
   * @param providersWithWeights Array de providers com seus respectivos pesos
   * @returns Lista ordenada de providers para tentativa em cascata
   *
   * @example
   * selectProviders([
   *   { provider: viaCep, weight: 70 },
   *   { provider: brasilApi, weight: 30 },
   *   { provider: apiCep, weight: 20 }
   * ])
   */
  selectProviders(
    providersWithWeights: ProviderWithWeight[],
  ): ProviderSelection {
    if (!providersWithWeights || providersWithWeights.length === 0) {
      throw new Error('Pelo menos um provider deve ser fornecido');
    }

    this.requestCount++;

    // Calcular peso total
    const totalWeight = providersWithWeights.reduce(
      (sum, p) => sum + p.weight,
      0,
    );

    if (totalWeight <= 0) {
      throw new Error('A soma dos pesos deve ser maior que zero');
    }

    // Selecionar provider primário baseado em peso
    const random = this.randomGenerator() * totalWeight;
    let accumulatedWeight = 0;
    let primaryIndex = 0;

    for (let i = 0; i < providersWithWeights.length; i++) {
      accumulatedWeight += providersWithWeights[i].weight;
      if (random < accumulatedWeight) {
        primaryIndex = i;
        break;
      }
    }

    const primaryProvider = providersWithWeights[primaryIndex];

    // Criar lista ordenada: primário primeiro, depois os outros em ordem de peso
    const remainingProviders = providersWithWeights
      .filter((_, index) => index !== primaryIndex)
      .sort((a, b) => b.weight - a.weight);

    const orderedProviders = [
      primaryProvider.provider,
      ...remainingProviders.map((p) => p.provider),
    ];

    this.logger.debug(
      `Request #${this.requestCount}: Order=[${orderedProviders.map((p) => p.name).join(' → ')}] (random=${random.toFixed(3)}/${totalWeight})`,
    );

    return {
      ordered: orderedProviders,
    };
  }

  /**
   * Retorna estatísticas de distribuição
   */
  getStats(): { totalRequests: number } {
    return {
      totalRequests: this.requestCount,
    };
  }

  /**
   * Reseta o contador
   */
  resetStats(): void {
    this.requestCount = 0;
  }
}
