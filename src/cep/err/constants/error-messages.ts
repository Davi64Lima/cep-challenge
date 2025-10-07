import { ErrorCode } from '../../../common/dto/error-response.dto';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_CEP]:
    'CEP inválido. O CEP deve conter 8 dígitos numéricos.',
  [ErrorCode.CEP_NOT_FOUND]:
    'CEP não encontrado em nenhum dos provedores disponíveis.',
  [ErrorCode.UPSTREAM_UNAVAILABLE]:
    'Todos os provedores de CEP estão temporariamente indisponíveis.',
  [ErrorCode.GATEWAY_TIMEOUT]:
    'Timeout ao consultar os provedores de CEP. Tente novamente.',
};

export const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_CEP]: 400,
  [ErrorCode.CEP_NOT_FOUND]: 404,
  [ErrorCode.UPSTREAM_UNAVAILABLE]: 503,
  [ErrorCode.GATEWAY_TIMEOUT]: 504,
};
