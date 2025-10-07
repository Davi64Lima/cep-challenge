import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { ICepProvider } from '../interfaces/cep-provider.interface';
import { AddressResponseDto } from '../../common/dto/address-response.dto';
import { CepException } from '../err/cep-exception';
import { ErrorCode } from '../../common/dto/error-response.dto';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

@Injectable()
export class ViaCepProvider implements ICepProvider {
  readonly name = 'ViaCEP';
  private readonly logger = new Logger(ViaCepProvider.name);
  private readonly baseURL: string;
  private readonly requestTimeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseURL = this.configService.get<string>(
      'providers.viacep.baseURL',
      'https://viacep.com.br/ws',
    );
    this.requestTimeout = this.configService.get<number>(
      'providers.viacep.timeout',
      5000,
    );
  }

  async findByCep(cep: string): Promise<AddressResponseDto> {
    const url = `${this.baseURL}/${cep}/json/`;

    this.logger.debug(`Consultando ViaCEP: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<ViaCepResponse>(url).pipe(
          timeout(this.requestTimeout),
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
      );

      // ViaCEP retorna 200 com { erro: true } quando CEP não existe
      if (response.data.erro) {
        this.logger.warn(`CEP ${cep} não encontrado no ViaCEP`);
        throw new CepException(
          ErrorCode.CEP_NOT_FOUND,
          { cep, provider: this.name },
          `CEP ${cep} não encontrado no provedor ${this.name}`,
        );
      }

      return this.mapToUnifiedFormat(response.data);
    } catch (error) {
      return this.handleError(error, cep);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseURL}/01310100/json/`)
          .pipe(timeout(3000)),
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private mapToUnifiedFormat(data: ViaCepResponse): AddressResponseDto {
    return {
      cep: data.cep,
      street: data.logradouro,
      complement: data.complemento || null,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      ibgeCode: data.ibge || null,
      giaCode: data.gia || null,
      dddCode: data.ddd || null,
      siafiCode: data.siafi || null,
    };
  }

  private handleError(error: any, cep: string): never {
    // Se já é CepException, propagar
    if (error instanceof CepException) {
      throw error;
    }

    if (error.name === 'TimeoutError') {
      this.logger.error(`Timeout ao consultar ViaCEP para CEP ${cep}`);
      throw new CepException(
        ErrorCode.GATEWAY_TIMEOUT,
        { cep, provider: this.name, timeout: this.requestTimeout },
        `Timeout ao consultar ${this.name}`,
      );
    }

    if (error.response) {
      const status = error.response.status;

      if (status === 404) {
        this.logger.warn(`CEP ${cep} não encontrado no ViaCEP (404)`);
        throw new CepException(
          ErrorCode.CEP_NOT_FOUND,
          { cep, provider: this.name, status },
          `CEP ${cep} não encontrado no provedor ${this.name}`,
        );
      }

      if (status >= 500) {
        this.logger.error(`Erro 5xx no ViaCEP: ${status}`);
        throw new CepException(
          ErrorCode.UPSTREAM_UNAVAILABLE,
          { cep, provider: this.name, status },
          `Provedor ${this.name} temporariamente indisponível`,
        );
      }
    }

    // Erro de rede ou outro erro desconhecido
    this.logger.error(`Erro ao consultar ViaCEP: ${error.message}`);
    throw new CepException(
      ErrorCode.UPSTREAM_UNAVAILABLE,
      { cep, provider: this.name, error: error.message },
      `Erro ao consultar provedor ${this.name}`,
    );
  }
}
