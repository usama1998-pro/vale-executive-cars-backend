import { Injectable } from '@nestjs/common';

type AttemptRecord = {
  failures: number;
  lockedUntil?: number;
  lastAttemptAt: number;
};

export type SigninAttemptStatus = {
  allowed: boolean;
  attemptsRemaining: number;
  maxAttempts: number;
  lockedUntil?: Date;
};

export type SigninFailureResult = {
  attemptsRemaining: number;
  maxAttempts: number;
  lockedUntil?: Date;
};

@Injectable()
export class SigninAttemptService {
  private readonly store = new Map<string, AttemptRecord>();
  readonly maxAttempts = Math.max(
    1,
    Number(process.env.SIGNIN_MAX_ATTEMPTS ?? 5) || 5,
  );
  private readonly lockoutMs =
    Math.max(1, Number(process.env.SIGNIN_LOCKOUT_MINUTES ?? 15) || 15) *
    60 *
    1000;

  private key(email: string, ip: string): string {
    return `${email.trim().toLowerCase()}|${ip || 'unknown'}`;
  }

  private freshStatus(): SigninAttemptStatus {
    return {
      allowed: true,
      attemptsRemaining: this.maxAttempts,
      maxAttempts: this.maxAttempts,
    };
  }

  checkAllowed(email: string, ip: string): SigninAttemptStatus {
    const record = this.store.get(this.key(email, ip));
    if (!record) {
      return this.freshStatus();
    }

    if (record.lockedUntil != null) {
      if (Date.now() < record.lockedUntil) {
        return {
          allowed: false,
          attemptsRemaining: 0,
          maxAttempts: this.maxAttempts,
          lockedUntil: new Date(record.lockedUntil),
        };
      }
      this.store.delete(this.key(email, ip));
      return this.freshStatus();
    }

    const attemptsRemaining = Math.max(
      0,
      this.maxAttempts - record.failures,
    );
    return {
      allowed: attemptsRemaining > 0,
      attemptsRemaining,
      maxAttempts: this.maxAttempts,
    };
  }

  recordFailure(email: string, ip: string): SigninFailureResult {
    const k = this.key(email, ip);
    const now = Date.now();
    const record = this.store.get(k) ?? { failures: 0, lastAttemptAt: now };
    record.failures += 1;
    record.lastAttemptAt = now;

    if (record.failures >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutMs;
    }

    this.store.set(k, record);
    const attemptsRemaining = Math.max(
      0,
      this.maxAttempts - record.failures,
    );

    return {
      attemptsRemaining,
      maxAttempts: this.maxAttempts,
      lockedUntil:
        record.lockedUntil != null
          ? new Date(record.lockedUntil)
          : undefined,
    };
  }

  clear(email: string, ip: string): void {
    this.store.delete(this.key(email, ip));
  }
}
