import {
  ProviderSelectorService,
  ProviderWithWeight,
} from '../providerSelector';
import { ICepProvider } from '../../interfaces/cep-provider.interface';

describe('ProviderSelectorService', () => {
  let service: ProviderSelectorService;

  const mockViaCepProvider: ICepProvider = {
    name: 'ViaCEP',
    findByCep: jest.fn(),
    isAvailable: jest.fn(),
  };

  const mockBrasilApiProvider: ICepProvider = {
    name: 'BrasilAPI',
    findByCep: jest.fn(),
    isAvailable: jest.fn(),
  };

  const mockApiCepProvider: ICepProvider = {
    name: 'ApiCEP',
    findByCep: jest.fn(),
    isAvailable: jest.fn(),
  };

  beforeEach(() => {
    service = new ProviderSelectorService();
  });

  describe('com controle (testes determinísticos)', () => {
    it('deve selecionar primeiro provider quando random < primeiro peso', () => {
      const mockRandom = jest.fn().mockReturnValue(0.3);
      service.setRandomGenerator(mockRandom);

      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 70 },
        { provider: mockBrasilApiProvider, weight: 30 },
      ];

      const result = service.selectProviders(providers);

      expect(result.ordered[0].name).toBe('ViaCEP');
      expect(result.ordered[1].name).toBe('BrasilAPI');
      expect(result.ordered).toHaveLength(2);
    });

    it('deve selecionar segundo provider quando random >= primeiro peso', () => {
      const mockRandom = jest.fn().mockReturnValue(0.8);
      service.setRandomGenerator(mockRandom);

      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 70 },
        { provider: mockBrasilApiProvider, weight: 30 },
      ];

      const result = service.selectProviders(providers);

      expect(result.ordered[0].name).toBe('BrasilAPI');
      expect(result.ordered[1].name).toBe('ViaCEP');
    });

    it('deve funcionar com 3 providers', () => {
      const mockRandom = jest.fn().mockReturnValue(0.75);
      service.setRandomGenerator(mockRandom);

      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 70 },
        { provider: mockBrasilApiProvider, weight: 20 },
        { provider: mockApiCepProvider, weight: 10 },
      ];

      const result = service.selectProviders(providers);

      expect(result.ordered[0].name).toBe('BrasilAPI');
      expect(result.ordered).toHaveLength(3);
      expect(result.ordered[1].name).toBe('ViaCEP');
      expect(result.ordered[2].name).toBe('ApiCEP');
    });

    it('deve alternar providers com sequência determinística', () => {
      const mockRandom = jest
        .fn()
        .mockReturnValueOnce(0.3)
        .mockReturnValueOnce(0.8)
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.9);

      service.setRandomGenerator(mockRandom);

      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 70 },
        { provider: mockBrasilApiProvider, weight: 30 },
      ];

      const results = [
        service.selectProviders(providers),
        service.selectProviders(providers),
        service.selectProviders(providers),
        service.selectProviders(providers),
      ];

      expect(results[0].ordered[0].name).toBe('ViaCEP');
      expect(results[1].ordered[0].name).toBe('BrasilAPI');
      expect(results[2].ordered[0].name).toBe('ViaCEP');
      expect(results[3].ordered[0].name).toBe('BrasilAPI');
    });
  });

  describe('com Math.random (testes estatísticos)', () => {
    beforeEach(() => {
      service = new ProviderSelectorService();
      service.resetStats();
    });

    it('deve distribuir ~70% ViaCEP e ~30% BrasilAPI em 1000 requests', () => {
      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 70 },
        { provider: mockBrasilApiProvider, weight: 30 },
      ];

      const counts = { ViaCEP: 0, BrasilAPI: 0 };
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const result = service.selectProviders(providers);
        counts[result.ordered[0].name]++;
      }

      const viaCepPercentage = counts.ViaCEP / iterations;
      const brasilApiPercentage = counts.BrasilAPI / iterations;

      expect(viaCepPercentage).toBeGreaterThanOrEqual(0.65);
      expect(viaCepPercentage).toBeLessThanOrEqual(0.8);
      expect(brasilApiPercentage).toBeGreaterThanOrEqual(0.25);
      expect(brasilApiPercentage).toBeLessThanOrEqual(0.35);
    });

    it('deve sempre retornar todos os providers na lista ordenada', () => {
      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 50 },
        { provider: mockBrasilApiProvider, weight: 30 },
        { provider: mockApiCepProvider, weight: 20 },
      ];

      for (let i = 0; i < 50; i++) {
        const result = service.selectProviders(providers);

        expect(result.ordered).toHaveLength(3);
        expect(result.ordered.map((p) => p.name)).toContain('ViaCEP');
        expect(result.ordered.map((p) => p.name)).toContain('BrasilAPI');
        expect(result.ordered.map((p) => p.name)).toContain('ApiCEP');

        const names = result.ordered.map((p) => p.name);
        expect(new Set(names).size).toBe(3);
      }
    });
  });

  describe('validações', () => {
    it('deve lançar erro se nenhum provider for fornecido', () => {
      expect(() => service.selectProviders([])).toThrow(
        'Pelo menos um provider deve ser fornecido',
      );
    });

    it('deve lançar erro se soma dos pesos for zero', () => {
      const providers: ProviderWithWeight[] = [
        { provider: mockViaCepProvider, weight: 0 },
        { provider: mockBrasilApiProvider, weight: 0 },
      ];

      expect(() => service.selectProviders(providers)).toThrow(
        'A soma dos pesos deve ser maior que zero',
      );
    });
  });
});
