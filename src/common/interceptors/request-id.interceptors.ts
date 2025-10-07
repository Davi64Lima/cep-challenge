import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Gerar ou usar request_id existente do header
    const requestId = request.headers['x-request-id'] || uuidv4();

    // Armazenar no request para uso posterior
    request.requestId = requestId;

    // Adicionar ao response header
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}
