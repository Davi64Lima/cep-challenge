import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse();

    let requestId = req.headers['x-request-id'] as string | undefined;
    if (!requestId) requestId = randomUUID();

    // Anexa no request e response header
    (req as any).id = requestId;
    res.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
