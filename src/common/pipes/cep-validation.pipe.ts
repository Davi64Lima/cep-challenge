import { PipeTransform, Injectable } from '@nestjs/common';
import { ErrorCode } from '../dto/error-response.dto';
import { CepException } from '../../cep/err/cep-exception';
@Injectable()
export class CepValidationPipe implements PipeTransform<string, string> {
  private readonly CEP_PATTERN = /^[0-9]{5}-?[0-9]{3}$/;

  transform(value: string): string {
    if (!value) {
      throw new CepException(
        ErrorCode.INVALID_CEP,
        { received: value },
        'CEP é obrigatório',
      );
    }

    const trimmedValue = value.trim();

    // Validar formato
    if (!this.CEP_PATTERN.test(trimmedValue)) {
      throw new CepException(
        ErrorCode.INVALID_CEP,
        {
          received: trimmedValue,
          expectedFormat: '12345-678 ou 12345678',
        },
        'CEP inválido. O CEP deve conter 8 dígitos numéricos (com ou sem hífen).',
      );
    }

    // Normalizar: remover hífen
    const normalizedCep = trimmedValue.replace('-', '');

    // Validar se não é um CEP com todos os dígitos iguais (ex: 00000000, 11111111)
    if (/^(\d)\1{7}$/.test(normalizedCep)) {
      throw new CepException(
        ErrorCode.INVALID_CEP,
        {
          received: trimmedValue,
          reason: 'CEP com todos os dígitos iguais não é válido',
        },
        'CEP inválido. CEP não pode ter todos os dígitos iguais.',
      );
    }

    return normalizedCep;
  }
}
