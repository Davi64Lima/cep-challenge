import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CepService } from './cep.service';
import { ProviderSelectorService } from './providers/providerSelector';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { CepException } from './err/cep-exception';
import { ErrorCode } from '../common/dto/error-response.dto';
import { AddressResponseDto } from '../common/dto/address-response.dto';

describe('CepService', () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Hit', () => {
    it('deve retornar do cache quando disponível', async () => {
      cacheManager.get.mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(cacheManager.get).toHaveBeenCalledWith('cep:01310100');
      expect(viaCepProvider.findByCep).not.toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).not.toHaveBeenCalled();
    });

    it('não deve consultar providers se cache estiver disponível', async () => {
      cacheManager.get.mockResolvedValue(mockAddress);

      await service.findAddressByCep('01310100');

      expect(viaCepProvider.findByCep).not.toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).not.toHaveBeenCalled();
    });
  });

  describe('Cache Miss - Sucesso no Provider Primário', () => {
    it('deve consultar provider primário e gravar no cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(viaCepProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(cacheManager.get).toHaveBeenCalledWith('cep:01310100');
      expect(viaCepProvider.findByCep).toHaveBeenCalledWith('01310100');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'cep:01310100',
        mockAddress,
        60 * 60 * 24, // 24h
      );
    });

    it('não deve chamar provider secundário se primário for bem-sucedido', async () => {
      cacheManager.get.mockResolvedValue(null);
      jest.spyOn(viaCepProvider, 'findByCep').mockResolvedValue(mockAddress);

      await service.findAddressByCep('01310100');

      expect(viaCepProvider.findByCep).toHaveBeenCalled();
      expect(brasilApiProvider.findByCep).not.toHaveBeenCalled();
    });
  });

  describe('Fallback por 404 (CEP_NOT_FOUND)', () => {
    it('deve fazer fallback quando primário retorna CEP_NOT_FOUND', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(
            ErrorCode.CEP_NOT_FOUND,
            { cep: '01310100' },
            'CEP não encontrado',
          ),
        );

      jest.spyOn(brasilApiProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(viaCepProvider.findByCep).toHaveBeenCalledWith('01310100');
      expect(brasilApiProvider.findByCep).toHaveBeenCalledWith('01310100');
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('Fallback por Erro Técnico', () => {
    it('deve fazer fallback quando primário retorna UPSTREAM_UNAVAILABLE', async () => {
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

    it('deve fazer fallback quando primário retorna GATEWAY_TIMEOUT', async () => {
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

  describe('Ambos 404 → 404 CEP_NOT_FOUND', () => {
    it('deve retornar 404 quando ambos providers retornam CEP_NOT_FOUND', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'CEP não encontrado'),
        );

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'CEP não encontrado'),
        );

      await expect(service.findAddressByCep('99999999')).rejects.toThrow(
        CepException,
      );

      try {
        await service.findAddressByCep('99999999');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.CEP_NOT_FOUND);
        expect(response.details.attempts).toBe(2);
        expect(response.details.providers).toEqual(['ViaCEP', 'BrasilAPI']);
      }

      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Ambos Falham Tecnicamente', () => {
    it('deve retornar UPSTREAM_UNAVAILABLE quando ambos retornam erro 5xx', async () => {
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

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(
            ErrorCode.UPSTREAM_UNAVAILABLE,
            {},
            'Serviço indisponível',
          ),
        );

      await expect(service.findAddressByCep('01310100')).rejects.toThrow(
        CepException,
      );

      try {
        await service.findAddressByCep('01310100');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
        expect(response.details.attempts).toBe(2);
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

      await expect(service.findAddressByCep('01310100')).rejects.toThrow(
        CepException,
      );

      try {
        await service.findAddressByCep('01310100');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.GATEWAY_TIMEOUT);
      }
    });

    it('deve priorizar GATEWAY_TIMEOUT quando há mix de erros incluindo timeout', async () => {
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

      await expect(service.findAddressByCep('01310100')).rejects.toThrow(
        CepException,
      );

      try {
        await service.findAddressByCep('01310100');
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.GATEWAY_TIMEOUT);
      }
    });
  });

  describe('Cenários Mistos', () => {
    it('deve retornar UPSTREAM_UNAVAILABLE quando há mix de NOT_FOUND e erros técnicos', async () => {
      cacheManager.get.mockResolvedValue(null);

      jest
        .spyOn(viaCepProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.CEP_NOT_FOUND, {}, 'CEP não encontrado'),
        );

      jest
        .spyOn(brasilApiProvider, 'findByCep')
        .mockRejectedValue(
          new CepException(ErrorCode.UPSTREAM_UNAVAILABLE, {}, 'Indisponível'),
        );

      await expect(service.findAddressByCep('01310100')).rejects.toThrow(
        CepException,
      );

      try {
        await service.findAddressByCep('01310100');
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.UPSTREAM_UNAVAILABLE);
      }
    });
  });

  describe('Integração com ProviderSelector', () => {
    it('deve respeitar ordem retornada pelo selector', async () => {
      cacheManager.get.mockResolvedValue(null);

      // Forçar BrasilAPI como primário
      const mockRandom = jest.fn().mockReturnValue(0.8);
      providerSelector.setRandomGenerator(mockRandom);

      jest.spyOn(brasilApiProvider, 'findByCep').mockResolvedValue(mockAddress);

      const result = await service.findAddressByCep('01310100');

      expect(result).toEqual(mockAddress);
      expect(brasilApiProvider.findByCep).toHaveBeenCalledWith('01310100');
      expect(viaCepProvider.findByCep).not.toHaveBeenCalled();
    });

    it('deve tentar ambos providers na ordem correta quando há falha', async () => {
      cacheManager.get.mockResolvedValue(null);

      const mockRandom = jest.fn().mockReturnValue(0.8);
      providerSelector.setRandomGenerator(mockRandom);

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
