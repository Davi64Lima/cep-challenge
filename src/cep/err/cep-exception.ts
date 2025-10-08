import { HttpException } from '@nestjs/common';
import {
  ErrorCode,
  ErrorResponseDto,
} from '../../common/dto/error-response.dto';
import {
  ERROR_MESSAGES,
  HTTP_STATUS_BY_ERROR_CODE,
} from './constants/error-messages';

export class CepException extends HttpException {
  constructor(
    code: ErrorCode,
    details?: Record<string, any>,
    customMessage?: string,
  ) {
    const message = customMessage || ERROR_MESSAGES[code];
    const status = HTTP_STATUS_BY_ERROR_CODE[code];

    const errorResponse: Omit<ErrorResponseDto, 'timestamp' | 'path'> = {
      code,
      message,
      details: details || null,
      request_id: '',
    };

    super(errorResponse, status);
  }
}
