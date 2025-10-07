import { CepValidationPipe } from './cep-validation.pipe';
import { CepException } from '../../cep/err/cep-exception';
import { ErrorCode } from '../dto/error-response.dto';

describe('CepValidationPipe (Unitário - Função Pura)', () => {
  let pipe: CepValidationPipe;

  beforeEach(() => {
    pipe = new CepValidationPipe();
  });

  describe('Normalização', () => {
    it('deve aceitar CEP com hífen e normalizar para sem hífen', () => {
      expect(pipe.transform('12345-678')).toBe('12345678');
      expect(pipe.transform('01310-100')).toBe('01310100');
    });

    it('deve aceitar CEP sem hífen', () => {
      expect(pipe.transform('12345678')).toBe('12345678');
      expect(pipe.transform('01310100')).toBe('01310100');
    });

    it('deve remover espaços em branco antes da validação', () => {
      expect(pipe.transform(' 12345-678 ')).toBe('12345678');
      expect(pipe.transform('  12345678  ')).toBe('12345678');
    });
  });

  describe('Validação - Rejeitar padrões inválidos', () => {
    it('deve rejeitar CEP com menos de 8 dígitos', () => {
      expect(() => pipe.transform('1234567')).toThrow(CepException);
      expect(() => pipe.transform('123-456')).toThrow(CepException);
    });

    it('deve rejeitar CEP com mais de 8 dígitos', () => {
      expect(() => pipe.transform('123456789')).toThrow(CepException);
      expect(() => pipe.transform('12345-6789')).toThrow(CepException);
    });

    it('deve rejeitar CEP com letras', () => {
      expect(() => pipe.transform('abcdefgh')).toThrow(CepException);
      expect(() => pipe.transform('1234a678')).toThrow(CepException);
      expect(() => pipe.transform('ABC12-345')).toThrow(CepException);
    });

    it('deve rejeitar CEP com caracteres especiais (exceto hífen)', () => {
      expect(() => pipe.transform('12345@678')).toThrow(CepException);
      expect(() => pipe.transform('12345.678')).toThrow(CepException);
      expect(() => pipe.transform('12345/678')).toThrow(CepException);
    });

    it('deve rejeitar CEP vazio ou null', () => {
      expect(() => pipe.transform('')).toThrow(CepException);
      expect(() => pipe.transform(null as any)).toThrow(CepException);
      expect(() => pipe.transform(undefined as any)).toThrow(CepException);
    });

    it('deve rejeitar CEP com todos os dígitos iguais', () => {
      expect(() => pipe.transform('00000000')).toThrow(CepException);
      expect(() => pipe.transform('11111-111')).toThrow(CepException);
      expect(() => pipe.transform('99999999')).toThrow(CepException);
    });
  });

  describe('Código de erro', () => {
    it('deve lançar CepException com código INVALID_CEP', () => {
      try {
        pipe.transform('abc123');
      } catch (error) {
        expect(error).toBeInstanceOf(CepException);
        const response = (error as any).getResponse();
        expect(response.code).toBe(ErrorCode.INVALID_CEP);
        expect(response.details).toHaveProperty('received');
      }
    });
  });
});
