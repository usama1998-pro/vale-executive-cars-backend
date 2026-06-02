import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { assertNoUniqueViolation } from '../../common/utils/prisma-error.util';
import { hashPassword } from '../../common/utils/password.util';
import { PrismaService } from '../../core/database/prisma.service';
import type {
  AuthUserResponse,
  AuthenticatedUser,
  JwtPayload,
  LoginResponse,
} from './auth.types';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtStrategy } from './strategies/jwt.strategy';
import { throwSigninFailed, throwSigninLocked } from './auth-signin.errors';
import { SigninAttemptService } from './signin-attempt.service';
import { TokenRevocationService } from './token-revocation.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly tokenRevocation: TokenRevocationService,
    private readonly signinAttempts: SigninAttemptService,
  ) {}

  private toAuthUser(user: {
    id: string;
    email: string;
    isAdmin: boolean;
    createdAt: Date;
  }): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      is_admin: user.isAdmin,
      created_at: user.createdAt.toISOString(),
    };
  }

  private async signAccessToken(
    payload: Omit<JwtPayload, 'jti'> & { tv: number },
  ): Promise<LoginResponse> {
    const access_token = await this.jwtService.signAsync({
      ...payload,
      jti: randomUUID(),
    } satisfies JwtPayload);
    const decoded = this.jwtService.decode<{ exp?: number }>(access_token);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.exp !== 'number'
    ) {
      throw new InternalServerErrorException(
        'Signed token is missing an exp claim',
      );
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const expires_in = Math.max(0, decoded.exp - nowSec);
    const expires_at = new Date(decoded.exp * 1000).toISOString();
    return { access_token, expires_in, expires_at };
  }

  async signin(
    dto: SigninDto,
    clientIp?: string,
  ): Promise<LoginResponse & { user: AuthUserResponse }> {
    const email = dto.email.trim().toLowerCase();
    const ip = clientIp?.trim() || 'unknown';

    const gate = this.signinAttempts.checkAllowed(email, ip);
    if (!gate.allowed) {
      if (gate.lockedUntil) {
        throwSigninLocked(gate.maxAttempts, gate.lockedUntil);
      }
      throw new UnauthorizedException(API_MESSAGES.auth.tooManyAttempts);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      const failure = this.signinAttempts.recordFailure(email, ip);
      throwSigninFailed(
        failure.attemptsRemaining,
        failure.maxAttempts,
        failure.lockedUntil,
      );
    }

    this.signinAttempts.clear(email, ip);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        tokenVersion: true,
        createdAt: true,
      },
    });

    const tokens = await this.signAccessToken({
      sub: updated.id,
      email: updated.email,
      is_admin: updated.isAdmin,
      tv: updated.tokenVersion,
    });

    return { ...tokens, user: this.toAuthUser(updated) };
  }

  async signup(dto: SignupDto): Promise<LoginResponse & { user: AuthUserResponse }> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          password: await hashPassword(dto.password),
          isAdmin: false,
        },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          tokenVersion: true,
          createdAt: true,
        },
      });
      const tokens = await this.signAccessToken({
        sub: user.id,
        email: user.email,
        is_admin: false,
        tv: user.tokenVersion,
      });
      return { ...tokens, user: this.toAuthUser(user) };
    } catch (e) {
      assertNoUniqueViolation(e, API_MESSAGES.auth.emailTaken);
      throw e;
    }
  }

  async me(userId: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isAdmin: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  private extractAccessToken(
    authorization: string | string[] | undefined,
  ): string | null {
    if (authorization == null) {
      return null;
    }
    const raw = Array.isArray(authorization) ? authorization[0] : authorization;
    if (typeof raw !== 'string') {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    const bearer = trimmed.match(/^Bearer\s+(.+)$/i);
    if (bearer?.[1]) {
      return bearer[1].trim();
    }
    if (trimmed.includes('.') && trimmed.split('.').length === 3) {
      return trimmed;
    }
    return null;
  }

  async isValidAdminAccessToken(token: string | undefined): Promise<boolean> {
    if (!token?.trim()) {
      return false;
    }
    try {
      const principal = await this.verifyBearer(`Bearer ${token.trim()}`);
      return Boolean(principal.is_admin);
    } catch {
      return false;
    }
  }

  async verifyBearer(
    authorization: string | string[] | undefined,
  ): Promise<AuthenticatedUser & { user: AuthUserResponse }> {
    const token = this.extractAccessToken(authorization);
    if (!token) {
      throw new UnauthorizedException(
        'Missing access token: send Authorization: Bearer <access_token>',
      );
    }
    let payload: JwtPayload & { exp?: number; iat?: number };
    try {
      payload = await this.jwtService.verifyAsync<
        JwtPayload & { exp?: number; iat?: number }
      >(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const principal = await this.jwtStrategy.validate(payload);
    const user = await this.me(principal.sub);
    return { ...principal, user };
  }

  async signout(
    authorization: string | string[] | undefined,
  ): Promise<{ revoked: boolean }> {
    const token = this.extractAccessToken(authorization);
    if (!token) {
      return { revoked: false };
    }
    try {
      const payload = await this.jwtService.verifyAsync<
        JwtPayload & { exp?: number }
      >(token);
      const { jti, exp } = payload;
      if (typeof exp === 'number' && typeof jti === 'string') {
        this.tokenRevocation.revokeUntil(jti, exp);
        return { revoked: true };
      }
      return { revoked: false };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
