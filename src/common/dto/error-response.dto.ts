import { ApiProperty } from '@nestjs/swagger';

export enum ErrorCode {
  INVALID_CEP = 'INVALID_CEP',
  CEP_NOT_FOUND = 'CEP_NOT_FOUND',
  UPSTREAM_UNAVAILABLE = 'UPSTREAM_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Código de erro padronizado',
    enum: ErrorCode,
    example: ErrorCode.CEP_NOT_FOUND,
  })
  code: ErrorCode;

  @ApiProperty({
    description: 'Mensagem de erro descritiva',
    example: 'CEP não encontrado em nenhum dos provedores',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Detalhes adicionais do erro',
    example: { cep: '00000-000', attempts: 3 },
    required: false,
    nullable: true,
    type: Object,
  })
  details?: Record<string, any> | null;

  @ApiProperty({
    description: 'ID único da requisição para rastreamento',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  request_id: string;

  @ApiProperty({
    description: 'Timestamp do erro no formato ISO 8601',
    example: '2025-10-07T10:30:00.000Z',
    type: String,
  })
  timestamp: string;

  @ApiProperty({
    description: 'Caminho da requisição que gerou o erro',
    example: '/api/v1/cep/00000-000',
    type: String,
  })
  path: string;
}
