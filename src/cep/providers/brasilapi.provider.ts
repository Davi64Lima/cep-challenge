import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { ICepProvider } from '../interfaces/cep-provider.interface';
import { AddressResponseDto } from '../../common/dto/address-response.dto';
import { CepException } from '../err/cep-exception';
import { ErrorCode } from '../../common/dto/error-response.dto';

interface BrasilApiResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  location?: {
    type: string;
    coordinates: {
      longitude: string;
      latitude: string;
    };
  };
}

@Injectable()
export class BrasilApiProvider implements ICepProvider {
  readonly name = 'BrasilAPI';
  private readonly logger = new Logger(BrasilApiProvider.name);
  private readonly baseURL: string;
  private readonly requestTimeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseURL = this.configService.get<string>(
      'providers.brasilapi.baseURL',
      'https://brasilapi.com.br/api/cep/v1',
    );
    this.requestTimeout = this.configService.get<number>(
      'providers.brasilapi.timeout',
      5000,
    );
  }

  async findByCep(cep: string): Promise<AddressResponseDto> {
    const url = `${this.baseURL}/${cep}`;

    this.logger.debug(`Consultando BrasilAPI: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<BrasilApiResponse>(url).pipe(
          timeout(this.requestTimeout),
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
      );

      return this.mapToUnifiedFormat(response.data);
    } catch (error) {
      return this.handleError(error, cep);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseURL}/01310100`).pipe(timeout(3000)),
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private mapToUnifiedFormat(data: BrasilApiResponse): AddressResponseDto {
    return {
      cep: data.cep,
      street: data.street,
      complement: null,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      ibgeCode: null,
      giaCode: null,
      dddCode: null,
      siafiCode: null,
    };
  }

  private handleError(error: any, cep: string): never {
    if (error.name === 'TimeoutError') {
      this.logger.error(`Timeout ao consultar BrasilAPI para CEP ${cep}`);
      throw new CepException(
        ErrorCode.GATEWAY_TIMEOUT,
        { cep, provider: this.name, timeout: this.requestTimeout },
        `Timeout ao consultar ${this.name}`,
      );
    }

    if (error.response) {
      const status = error.response.status;

      if (status === 404) {
        this.logger.warn(`CEP ${cep} não encontrado no BrasilAPI (404)`);
        throw new CepException(
          ErrorCode.CEP_NOT_FOUND,
          { cep, provider: this.name, status },
          `CEP ${cep} não encontrado no provedor ${this.name}`,
        );
      }

      if (status >= 500) {
        this.logger.error(`Erro 5xx no BrasilAPI: ${status}`);
        throw new CepException(
          ErrorCode.UPSTREAM_UNAVAILABLE,
          { cep, provider: this.name, status },
          `Provedor ${this.name} temporariamente indisponível`,
        );
      }

      if (status === 400) {
        this.logger.warn(`CEP ${cep} inválido segundo BrasilAPI`);
        throw new CepException(
          ErrorCode.INVALID_CEP,
          { cep, provider: this.name, status },
          `CEP inválido segundo ${this.name}`,
        );
      }
    }

    // Erro de rede ou outro erro desconhecido
    this.logger.error(`Erro ao consultar BrasilAPI: ${error.message}`);
    throw new CepException(
      ErrorCode.UPSTREAM_UNAVAILABLE,
      { cep, provider: this.name, error: error.message },
      `Erro ao consultar provedor ${this.name}`,
    );
  }
}
