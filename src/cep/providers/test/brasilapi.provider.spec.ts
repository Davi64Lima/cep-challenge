import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { BrasilApiProvider } from '../brasilapi.provider';
import { CepException } from '../../err/cep-exception';
import { ErrorCode } from '../../../common/dto/error-response.dto';

describe('BrasilApiProvider', () => {
  let provider: BrasilApiProvider;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'providers.brasilapi.baseURL': 'https://brasilapi.com.br/api/cep/v1',
        'providers.brasilapi.timeout': 5000,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrasilApiProvider,
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

    provider = module.get<BrasilApiProvider>(BrasilApiProvider);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('findByCep', () => {
    it('deve retornar endereço no formato unificado quando CEP existe', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          cep: '01310100',
          state: 'SP',
          city: 'São Paulo',
          neighborhood: 'Bela Vista',
          street: 'Avenida Paulista',
          service: 'viacep',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await provider.findByCep('01310100');

      expect(result).toEqual({
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
      });
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
        response: { status: 500 },
        message: 'Internal Server Error',
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
  });
});
