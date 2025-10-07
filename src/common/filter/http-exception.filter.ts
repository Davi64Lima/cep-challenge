import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto, ErrorCode } from '../dto/error-response.dto';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Obter request_id do request (definido pelo interceptor)
    const requestId = (request as any).requestId || 'unknown';

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
            'request_id' | 'timestamp' | 'path'
          >),
          request_id: requestId,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      } else {
        errorResponse = {
          code: ErrorCode.UPSTREAM_UNAVAILABLE,
          message:
            typeof exceptionResponse === 'string'
              ? exceptionResponse
              : (exceptionResponse as any).message ||
                'Erro interno do servidor',
          details: null,
          request_id: requestId,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else {
      errorResponse = {
        code: ErrorCode.UPSTREAM_UNAVAILABLE,
        message: 'Erro interno do servidor',
        details: null,
        request_id: requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    response.status(status).json(errorResponse);
  }
}
