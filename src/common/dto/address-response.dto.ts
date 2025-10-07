import { ApiProperty } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({
    description: 'CEP formatado (com ou sem hífen)',
    example: '01310-100',
    type: String,
  })
  cep: string;

  @ApiProperty({
    description: 'Nome da rua/logradouro',
    example: 'Avenida Paulista',
    type: String,
  })
  street: string;

  @ApiProperty({
    description: 'Complemento do endereço',
    example: 'de 612 a 1510 - lado par',
    required: false,
    nullable: true,
    type: String,
  })
  complement?: string | null;

  @ApiProperty({
    description: 'Nome do bairro',
    example: 'Bela Vista',
    type: String,
  })
  neighborhood: string;

  @ApiProperty({
    description: 'Nome da cidade',
    example: 'São Paulo',
    type: String,
  })
  city: string;

  @ApiProperty({
    description: 'Sigla do estado (UF)',
    example: 'SP',
    type: String,
    minLength: 2,
    maxLength: 2,
  })
  state: string;

  @ApiProperty({
    description: 'Código IBGE do município',
    example: '3550308',
    required: false,
    nullable: true,
    type: String,
  })
  ibgeCode?: string | null;

  @ApiProperty({
    description: 'Código GIA (Guia de Informação e Apuração do ICMS)',
    example: '1004',
    required: false,
    nullable: true,
    type: String,
  })
  giaCode?: string | null;

  @ApiProperty({
    description: 'Código DDD da região',
    example: '11',
    required: false,
    nullable: true,
    type: String,
  })
  dddCode?: string | null;

  @ApiProperty({
    description: 'Código SIAFI (Sistema Integrado de Administração Financeira)',
    example: '7107',
    required: false,
    nullable: true,
    type: String,
  })
  siafiCode?: string | null;
}
