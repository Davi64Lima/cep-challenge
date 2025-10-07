import { Injectable } from '@nestjs/common';
import { AddressResponseDto } from '../common/dto/address-response.dto';

@Injectable()
export class CepService {
  async findAddressByCep(cep: string): Promise<AddressResponseDto> {
    // TODO: Implementar lógica de consulta aos provedores
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simular delay
    throw new Error('Not implemented');
  }
}
