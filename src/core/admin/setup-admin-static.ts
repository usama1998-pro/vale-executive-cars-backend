import { INestApplication } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Request, Response } from 'express';
import express from 'express';

function resolveAdminPublicDir(): string {
  const candidates = [
    join(process.cwd(), 'public', 'admin'),
    join(process.cwd(), 'dist', 'public', 'admin'),
    join(__dirname, '..', '..', '..', 'public', 'admin'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) {
      return dir;
    }
  }
  return join(process.cwd(), 'public', 'admin');
}

export function setupAdminStatic(app: INestApplication): void {
  const adminDir = resolveAdminPublicDir();
  const http = app.getHttpAdapter().getInstance();

  http.use('/admin', express.static(adminDir, { index: false }));

  const sendAdminPage = (_req: Request, res: Response) => {
    res.sendFile(join(adminDir, 'index.html'));
  };

  http.get('/admin', sendAdminPage);
  http.get('/admin/', sendAdminPage);
}
