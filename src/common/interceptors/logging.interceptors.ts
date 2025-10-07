import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Acessar requestId que foi definido pelo RequestIdInterceptor
    const requestId = request.requestId || 'unknown';

    const now = Date.now();

    this.logger.log(`--> ${method} ${url} [rid=${requestId}]`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log(
            `<-- ${method} ${url} [rid=${requestId}] ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `<-- ${method} ${url} [rid=${requestId}] ${duration}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
