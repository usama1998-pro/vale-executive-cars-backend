import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { getThrottleLimit, getThrottleTtlMs } from './throttler.config';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const limit = detail.limit ?? getThrottleLimit();
    const ttlMs = detail.ttl ?? getThrottleTtlMs();
    const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

    throw new HttpException(
      {
        message: API_MESSAGES.generic.throttled(limit),
        data: {
          limit,
          windowSeconds: retryAfterSeconds,
          retryAfterSeconds,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
