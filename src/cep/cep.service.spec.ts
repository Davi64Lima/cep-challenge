import { Test, TestingModule } from '@nestjs/testing';
import { CepService } from './cep.service';
import { ProviderSelectorService } from './providers/providerSelector';
import { ViaCepProvider } from './providers/viacep.provider';
import { BrasilApiProvider } from './providers/brasilapi.provider';
import { CepException } from './err/cep-exception';
import { ErrorCode } from '../common/dto/error-response.dto';

describe('CepService (integração com ProviderSelector)', () => {
  let service: CepService;
  let viaCepProvider: ViaCepProvider;
  let brasilApiProvider: BrasilApiProvider;
  let providerSelector: ProviderSelectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CepService,
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

  it('deve usar provider primário quando bem-sucedido', async () => {
    const mockAddress = {
      cep: '01310-100',
      street: 'Avenida Paulista',
      complement: null,
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      ibgeCode: null,
      giaCode: null,
      dddCode: null,
      siafiCode: null,
    };

    jest.spyOn(viaCepProvider, 'findByCep').mockResolvedValue(mockAddress);

    const result = await service.findAddressByCep('01310100');

    expect(result).toEqual(mockAddress);
    expect(viaCepProvider.findByCep).toHaveBeenCalledWith('01310100');
    // BrasilAPI não deve ser chamado se ViaCEP funcionar
  });

  it('deve fazer fallback para secundário quando primário falha', async () => {
    const mockAddress = {
      cep: '01310100',
      street: 'Avenida Paulista',
      complement: null,
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      ibgeCode: null,
      giaCode: null,
      dddCode: null,
      siafiCode: null,
    };

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
