import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { ViaCepProvider } from '../viacep.provider';
import { CepException } from '../../err/cep-exception';
import { ErrorCode } from '../../../common/dto/error-response.dto';

describe('ViaCepProvider', () => {
  let provider: ViaCepProvider;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'providers.viacep.baseURL': 'https://viacep.com.br/ws',
        'providers.viacep.timeout': 5000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViaCepProvider,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<ViaCepProvider>(ViaCepProvider);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('findByCep', () => {
    it('deve retornar endereço no formato unificado quando CEP existe', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: 'de 612 a 1510 - lado par',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
          ibge: '3550308',
          gia: '1004',
          ddd: '11',
          siafi: '7107',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await provider.findByCep('01310100');

      expect(result).toEqual({
        cep: '01310-100',
        street: 'Avenida Paulista',
        complement: 'de 612 a 1510 - lado par',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        ibgeCode: '3550308',
        giaCode: '1004',
        dddCode: '11',
        siafiCode: '7107',
      });
    });

    it('deve lançar CEP_NOT_FOUND quando ViaCEP retorna erro:true', async () => {
      const mockResponse: AxiosResponse = {
        data: { erro: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      await expect(provider.findByCep('99999999')).rejects.toThrow(
        CepException,
      );

      try {
        await provider.findByCep('99999999');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(ErrorCode.CEP_NOT_FOUND);
      }
    });

    it('deve lançar CEP_NOT_FOUND quando status 404', async () => {
      const mockError = {
        response: { status: 404 },
        message: 'Not Found',
      } as AxiosError;

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('99999999');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(ErrorCode.CEP_NOT_FOUND);
      }
    });

    it('deve lançar UPSTREAM_UNAVAILABLE quando status 5xx', async () => {
      const mockError = {
        response: { status: 503 },
        message: 'Service Unavailable',
      } as AxiosError;

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('01310100');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(
          ErrorCode.UPSTREAM_UNAVAILABLE,
        );
      }
    });

    it('deve lançar GATEWAY_TIMEOUT em caso de timeout', async () => {
      const mockError = { name: 'TimeoutError' };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('01310100');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(
          ErrorCode.GATEWAY_TIMEOUT,
        );
      }
    });
  });
});
