import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, IsNotEmpty } from 'class-validator';

export class CepQueryDto {
  @ApiProperty({
    description: 'CEP a ser consultado (com ou sem hífen, apenas números)',
    example: '01310100',
    pattern: '^[0-9]{8}$|^[0-9]{5}-[0-9]{3}$',
    minLength: 8,
    maxLength: 9,
  })
  @IsString({ message: 'CEP deve ser uma string' })
  @IsNotEmpty({ message: 'CEP é obrigatório' })
  @Matches(/^[0-9]{8}$|^[0-9]{5}-[0-9]{3}$/, {
    message: 'CEP deve conter 8 dígitos numéricos (com ou sem hífen)',
  })
  cep: string;
}
