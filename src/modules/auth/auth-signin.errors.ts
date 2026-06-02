import { HttpException, HttpStatus } from '@nestjs/common';
import { API_MESSAGES } from '../../common/messages/api-messages';

export type SigninAttemptErrorData = {
  attemptsRemaining: number;
  maxAttempts: number;
  lockedUntil?: string;
};

function formatLockedMessage(lockedUntil: Date): string {
  const mins = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000));
  return `Too many failed sign-in attempts. Try again in about ${mins} minute${mins === 1 ? '' : 's'}.`;
}

export function throwSigninLocked(
  maxAttempts: number,
  lockedUntil: Date,
): never {
  throw new HttpException(
    {
      message: formatLockedMessage(lockedUntil),
      data: {
        attemptsRemaining: 0,
        maxAttempts,
        lockedUntil: lockedUntil.toISOString(),
      } satisfies SigninAttemptErrorData,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export function throwSigninFailed(
  attemptsRemaining: number,
  maxAttempts: number,
  lockedUntil?: Date,
): never {
  if (attemptsRemaining <= 0 && lockedUntil) {
    throwSigninLocked(maxAttempts, lockedUntil);
  }

  const message =
    attemptsRemaining > 0
      ? `${API_MESSAGES.auth.invalidCredentials} ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
      : API_MESSAGES.auth.invalidCredentials;

  throw new HttpException(
    {
      message,
      data: {
        attemptsRemaining,
        maxAttempts,
        ...(lockedUntil
          ? { lockedUntil: lockedUntil.toISOString() }
          : {}),
      } satisfies SigninAttemptErrorData,
    },
    HttpStatus.UNAUTHORIZED,
  );
}
