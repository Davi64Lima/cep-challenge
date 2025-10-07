import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const method: string = req.method;
    const url: string = req.url;
    const requestId = req.id;
    const started = Date.now();

    this.logger.log(`--> ${method} ${url} [rid=${requestId}]`);

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - started;
        this.logger.log(`<-- ${method} ${url} ${ms}ms [rid=${requestId}]`);
      }),
    );
  }
}
