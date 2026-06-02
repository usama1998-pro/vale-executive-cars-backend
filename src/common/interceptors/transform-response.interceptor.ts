import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { API_SUCCESS_MESSAGE_KEY } from '../decorators/api-success-message.decorator';
import { SKIP_API_WRAP_KEY } from '../decorators/skip-api-wrap.decorator';

export type ApiSuccessEnvelope<T = unknown> = {
  success: true;
  message: string;
  data: T;
};

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_API_WRAP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }

    const customMessage = this.reflector.getAllAndOverride<string>(
      API_SUCCESS_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data) => {
        if (data === undefined || data === null) {
          return {
            success: true,
            message: customMessage ?? 'Request completed successfully.',
            data: null,
          } satisfies ApiSuccessEnvelope<null>;
        }

        if (
          typeof data === 'object' &&
          data !== null &&
          'success' in data &&
          (data as { success: unknown }).success === true
        ) {
          return data;
        }

        return {
          success: true,
          message: customMessage ?? 'Request completed successfully.',
          data,
        } satisfies ApiSuccessEnvelope;
      }),
    );
  }
}
