import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({
    description: 'CEP formatado sem hífen',
    example: '01310100',
    pattern: '^\\d{8}$',
  })
  cep: string;

  @ApiProperty({
    description: 'Nome da rua/avenida/logradouro',
    example: 'Avenida Paulista',
    maxLength: 255,
  })
  street: string;

  @ApiPropertyOptional({
    description: 'Complemento do endereço',
    example: 'de 612 a 1510 - lado par',
    nullable: true,
  })
  complement: string | null;

  @ApiProperty({
    description: 'Nome do bairro',
    example: 'Bela Vista',
    maxLength: 100,
  })
  neighborhood: string;

  @ApiProperty({
    description: 'Nome da cidade',
    example: 'São Paulo',
    maxLength: 100,
  })
  city: string;

  @ApiProperty({
    description: 'Sigla do estado (UF)',
    example: 'SP',
    minLength: 2,
    maxLength: 2,
    pattern: '^[A-Z]{2}$',
  })
  state: string;

  @ApiPropertyOptional({
    description: 'Código IBGE do município',
    example: '3550308',
    nullable: true,
  })
  ibgeCode: string | null;

  @ApiPropertyOptional({
    description: 'Código GIA (Guia de Informação e Apuração do ICMS)',
    example: '1004',
    nullable: true,
  })
  giaCode: string | null;

  @ApiPropertyOptional({
    description: 'Código DDD da região',
    example: '11',
    nullable: true,
  })
  dddCode: string | null;

  @ApiPropertyOptional({
    description: 'Código SIAFI (Sistema Integrado de Administração Financeira)',
    example: '7107',
    nullable: true,
  })
  siafiCode: string | null;

  @ApiPropertyOptional({
    description: 'Informações adicionais do provedor (se disponíveis)',
    example: 'ViaCEP',
    nullable: true,
  })
  source: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp da consulta',
    example: '2025-10-07T10:30:00.000Z',
    nullable: true,
  })
  timestamp: string | null;
}
