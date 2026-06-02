import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method?: string;
      url?: string;
      route?: { path?: string };
    }>();
    const method = request.method ?? 'UNKNOWN';
    const path = request.route?.path ?? request.url ?? '';
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          const response = http.getResponse<{ statusCode?: number }>();
          const status = response.statusCode ?? 200;
          this.logger.log(`${method} ${path} ${status} ${ms}ms`);
        },
        error: (error: unknown) => {
          const ms = Date.now() - started;
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof (error as { status: unknown }).status === 'number'
              ? (error as { status: number }).status
              : 500;
          this.logger.warn(`${method} ${path} ${status} ${ms}ms (failed)`);
        },
      }),
    );
  }
}
