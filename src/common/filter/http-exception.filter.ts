import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto, ErrorCode } from '../../cep/dto/error-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponseDto;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        'code' in exceptionResponse
      ) {
        errorResponse = {
          ...(exceptionResponse as Omit<
            ErrorResponseDto,
            'timestamp' | 'path'
          >),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      } else {
        let message = 'Erro interno do servidor';
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
        } else if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null &&
          'message' in exceptionResponse &&
          typeof exceptionResponse.message === 'string'
        ) {
          message = exceptionResponse.message;
        }

        errorResponse = {
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message,
          details: null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else {
      errorResponse = {
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: 'Erro interno do servidor',
        details: null,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json(errorResponse);
  }
}
