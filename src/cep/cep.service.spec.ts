import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CepService } from './cep.service';
import { ProviderSelectorService } from './providers/providerSelector';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { CepException } from './err/cep-exception';
import { ErrorCode } from '../common/dto/error-response.dto';
import { AddressResponseDto } from '../common/dto/address-response.dto';

describe('CepService (Integração - Providers Mockados)', () => {
  let service: CepService;
  let viaCepProvider: ViaCepProvider;
  let brasilApiProvider: BrasilApiProvider;
  let providerSelector: ProviderSelectorService;
  let cacheManager: any;

  const mockAddress: AddressResponseDto = {
    cep: '01310-100',
    street: 'Avenida Paulista',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    ibgeCode: '3550308',
    giaCode: null,
    dddCode: '11',
    siafiCode: null,
  };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ViaCepProvider,
          useValue: {
            name: 'ViaCEP',
            findByCep: jest.fn(),
            isAvailable: jest.fn(),
          },
        },
        {
          provide: BrasilApiProvider,
          useValue: {
            name: 'BrasilAPI',
            findByCep: jest.fn(),
            isAvailable: jest.fn(),
          },
        },
        ProviderSelectorService,
      ],
    }).compile();

    service = module.get<CepService>(CepService);
    viaCepProvider = module.get<ViaCepProvider>(ViaCepProvider);
    brasilApiProvider = module.get<BrasilApiProvider>(BrasilApiProvider);
    providerSelector = module.get<ProviderSelectorService>(
      ProviderSelectorService,
    );

    // Forçar ViaCEP como primário para todos os testes (padrão)
    providerSelector.setRandomGenerator(() => 0.3); // 30% -> ViaCEP primário
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sucesso', () => {
    it('deve retornar endereço do provider primário', async () => {
      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(viaCepProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(viaCepProvider.findByCep).toHaveBeenCalledWith('01310100');
      expect(brasilApiProvider.findByCep).not.toHaveBeenCalled();
    });

    it('deve gravar resultado no cache após sucesso', async () => {
      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(viaCepProvider, 'findByCep').mockResolvedValue(mockAddress);

      await service.findAddressByCep('01310100');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'cep:01310100',
        mockAddress,
        60 * 60 * 24,
      );
    });
  });

  describe('Fallback por 404', () => {
    it('deve tentar secundário quando primário retorna CEP_NOT_FOUND', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'CEP não encontrado'),
        );

      jest.spyOn(brasilApiProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(viaCepProvider.findByCep).toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('Fallback por erro técnico', () => {
    it('deve tentar secundário quando primário retorna UPSTREAM_UNAVAILABLE', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(
            ErrorCode.UPSTREAM_UNAVAILABLE,
            {},
            'Serviço indisponível',
          ),
        );

      jest.spyOn(brasilApiProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(viaCepProvider.findByCep).toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).toHaveBeenCalled();
    });

    it('deve tentar secundário quando primário retorna GATEWAY_TIMEOUT', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.GATEWAY_TIMEOUT, {}, 'Timeout'),
        );

      jest.spyOn(brasilApiProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(viaCepProvider.findByCep).toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).toHaveBeenCalled();
    });
  });

  describe('Ambos falham', () => {
    it('deve retornar CEP_NOT_FOUND quando ambos retornam 404', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'Não encontrado'),
        );

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'Não encontrado'),
        );

      try {
        await service.findAddressByCep('99999999');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.CEP_NOT_FOUND);
        expect(response.details.attempts).toBe(2);
        expect(cacheManager.set).not.toHaveBeenCalled();
      }
    });

    it('deve retornar GATEWAY_TIMEOUT quando ambos retornam timeout', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.GATEWAY_TIMEOUT, {}, 'Timeout'),
        );

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.GATEWAY_TIMEOUT, {}, 'Timeout'),
        );

      try {
        await service.findAddressByCep('01310100');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.GATEWAY_TIMEOUT);
      }
    });

    it('deve retornar UPSTREAM_UNAVAILABLE quando ambos retornam 5xx', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.UPSTREAM_UNAVAILABLE, {}, 'Indisponível'),
        );

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.UPSTREAM_UNAVAILABLE, {}, 'Indisponível'),
        );

      try {
        await service.findAddressByCep('01310100');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
      }
    });

    it('deve priorizar GATEWAY_TIMEOUT em erros mistos', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.GATEWAY_TIMEOUT, {}, 'Timeout'),
        );

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.UPSTREAM_UNAVAILABLE, {}, 'Indisponível'),
        );

      try {
        await service.findAddressByCep('01310100');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.GATEWAY_TIMEOUT);
      }
    });
  });

  describe('Cache hit', () => {
    it('deve retornar do cache sem consultar providers', async () => {
      cacheManager.get.mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(cacheManager.get).toHaveBeenCalledWith('cep:01310100');
      expect(viaCepProvider.findByCep).not.toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).not.toHaveBeenCalled();
    });
  });

  describe('Integração com ProviderSelector', () => {
    it('deve respeitar ordem retornada pelo selector', async () => {
      cacheManager.get.mockResolvedValue(null);

      // Forçar BrasilAPI como primário
      providerSelector.setRandomGenerator(() => 0.8); // 80% -> BrasilAPI primário

      jest.spyOn(brasilApiProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(brasilApiProvider.findByCep).toHaveBeenCalledWith('01310100');
      expect(viaCepProvider.findByCep).not.toHaveBeenCalled();
    });

    it('deve tentar ambos providers na ordem correta quando há falha', async () => {
      cacheManager.get.mockResolvedValue(null);

      // Forçar BrasilAPI como primário
      providerSelector.setRandomGenerator(() => 0.8);

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'Não encontrado'),
        );

      jest.spyOn(viaCepProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(brasilApiProvider.findByCep).toHaveBeenCalled();
      expect(viaCepProvider.findByCep).toHaveBeenCalled();
    });
  });
});
