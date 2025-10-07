import { AddressResponseDto } from '../../common/dto/address-response.dto';

export interface ICepProvider {
  /**
   * Nome do provedor (usado para logs e monitoramento)
   */
  readonly name: string;

  /**
   * Consulta um CEP no provedor
   * @param cep CEP normalizado (8 dígitos, sem hífen)
   * @returns Dados do endereço no formato unificado
   * @throws CepException com código apropriado (CEP_NOT_FOUND, UPSTREAM_UNAVAILABLE, GATEWAY_TIMEOUT)
   */
  findByCep(cep: string): Promise<AddressResponseDto>;

  /**
   * Verifica se o provedor está disponível
   * @returns true se o provedor está operacional
   */
  isAvailable(): Promise<boolean>;
}
