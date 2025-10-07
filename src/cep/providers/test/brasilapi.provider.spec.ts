import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { BrasilApiProvider } from '../brasilapi.provider';
import { CepException } from '../../err/cep-exception';
import { ErrorCode } from '../../../common/dto/error-response.dto';

describe('BrasilApiProvider (Unitário - Adapter)', () => {
  let provider: BrasilApiProvider;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'providers.brasilapi.baseURL': 'https://brasilapi.com.br/api/cep/v1',
        'providers.brasilapi.timeout': 5000,
      };
      return config[key] || defaultValue;
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

  describe('Mapeamento de campos (formato unificado)', () => {
    it('deve mapear resposta da BrasilAPI para formato unificado', async () => {
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

    it('deve preencher campos não disponíveis com null', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          cep: '01310100',
          state: 'SP',
          city: 'São Paulo',
          neighborhood: 'Bela Vista',
          street: 'Avenida Paulista',
          service: 'brasilapi',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await provider.findByCep('01310100');

      expect(result.complement).toBeNull();
      expect(result.ibgeCode).toBeNull();
      expect(result.giaCode).toBeNull();
      expect(result.dddCode).toBeNull();
      expect(result.siafiCode).toBeNull();
    });
  });

  describe('Diferenciação: 404 vs 400 vs 5xx vs Timeout', () => {
    it('deve lançar CEP_NOT_FOUND quando status é 404', async () => {
      const mockError = {
        response: { status: 404 },
        message: 'Not Found',
      } as AxiosError;

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('99999999');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(ErrorCode.CEP_NOT_FOUND);
      }
    });

    it('deve lançar INVALID_CEP quando status é 400', async () => {
      const mockError = {
        response: { status: 400 },
        message: 'Bad Request',
      } as AxiosError;

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('abc123');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(ErrorCode.INVALID_CEP);
      }
    });

    it('deve lançar UPSTREAM_UNAVAILABLE quando status é 500', async () => {
      const mockError = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as AxiosError;

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('01310100');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(
          ErrorCode.UPSTREAM_UNAVAILABLE,
        );
      }
    });

    it('deve lançar GATEWAY_TIMEOUT quando ocorre timeout', async () => {
      const mockError = { name: 'TimeoutError' };

      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(throwError(() => mockError));

      try {
        await provider.findByCep('01310100');
        fail('Deveria ter lançado exceção');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        expect((error as any).getResponse().code).toBe(
          ErrorCode.GATEWAY_TIMEOUT,
        );
      }
    });
  });
});
