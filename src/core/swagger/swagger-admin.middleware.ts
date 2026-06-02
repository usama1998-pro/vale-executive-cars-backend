import { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { getSwaggerPath } from './setup-swagger';

export const ADMIN_TOKEN_COOKIE = 'vec_admin_token';

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (key === name) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return undefined;
}

function extractAccessToken(req: Request): string | undefined {
  const fromCookie = readCookie(req, ADMIN_TOKEN_COOKIE);
  if (fromCookie) return fromCookie;
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return undefined;
}

export function registerSwaggerAdminGuard(
  app: INestApplication,
  authService: AuthService,
): void {
  const prefix = `/${getSwaggerPath()}`;
  const http = app.getHttpAdapter().getInstance();

  http.use(async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path ?? '';
    if (!path.startsWith(prefix)) {
      return next();
    }

    const token = extractAccessToken(req);
    if (await authService.isValidAdminAccessToken(token)) {
      return next();
    }

    const accept = req.headers.accept ?? '';
    const wantsHtml =
      typeof accept === 'string' && accept.includes('text/html');
    if (wantsHtml || path === prefix || path === `${prefix}/`) {
      const nextPath = encodeURIComponent(path);
      return res.redirect(302, `/admin?next=${nextPath}`);
    }

    return res.status(401).json({
      success: false,
      message: 'Admin sign-in required to access API documentation',
      statusCode: 401,
    });
  });
}
