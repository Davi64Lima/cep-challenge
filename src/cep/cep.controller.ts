import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CepService } from './cep.service';
import { AddressResponseDto } from '../common/dto/address-response.dto';
import { ErrorResponseDto, ErrorCode } from '../common/dto/error-response.dto';
import { CepValidationPipe } from '../common/pipes/cep-validation.pipe';

@ApiTags('cep')
@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(':cep')
  @ApiOperation({
    summary: 'Consultar endereço por CEP',
    description: `
      Busca informações de endereço a partir de um CEP brasileiro.
      
      **Funcionamento:**
      - Alterna entre ViaCEP (70%) e BrasilAPI (30%)
      - Em caso de falha, tenta automaticamente o provedor alternativo
      - Resultados são armazenados em cache por 24 horas
      - Tempo máximo de resposta: 5 segundos por provedor
      
      **Formato do CEP:**
      - Com hífen: 01310-100
      - Sem hífen: 01310100
      
      **Provedores utilizados:**
      - [ViaCEP](https://viacep.com.br/)
      - [BrasilAPI](https://brasilapi.com.br/)
    `,
  })
  @ApiParam({
    name: 'cep',
    description: 'CEP a ser consultado (8 dígitos, com ou sem hífen)',
    example: '01310-100',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Endereço encontrado com sucesso',
    type: AddressResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'CEP inválido',
    type: ErrorResponseDto,
    example: {
      code: ErrorCode.INVALID_CEP,
      message:
        'CEP inválido. O CEP deve conter 8 dígitos numéricos (com ou sem hífen).',
      details: {
        received: 'abc',
        expectedFormat: '12345-678 ou 12345678',
      },
      request_id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2025-10-07T10:30:00.000Z',
      path: '/api/v1/cep/abc',
    },
  })
  @ApiResponse({
    status: 404,
    description: 'CEP não encontrado',
    type: ErrorResponseDto,
    example: {
      code: ErrorCode.CEP_NOT_FOUND,
      message: 'CEP não encontrado em nenhum dos provedores disponíveis.',
      details: {
        cep: '99999999',
        attempts: 3,
      },
      request_id: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2025-10-07T10:30:00.000Z',
      path: '/api/v1/cep/99999999',
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Serviços upstream indisponíveis',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 504,
    description: 'Timeout ao consultar provedores',
    type: ErrorResponseDto,
  })
  async findAddressByCep(
    @Param('cep', CepValidationPipe) cep: string,
  ): Promise<AddressResponseDto> {
    return this.cepService.findAddressByCep(cep);
  }
}
