/**
 * Idempotent admin bootstrap for CI / `npm run build` / `npm run migrate:deploy`.
 *
 * If both ADMIN_EMAIL and ADMIN_PASSWORD are set, ensures one staff admin (`is_admin: true`)
 * exists. If both are unset, exits 0 without connecting to the DB.
 *
 * Does not insert on every run:
 * - Admin already exists → no-op (password unchanged).
 * - User exists but not admin → promoted with `is_admin: true`.
 * - No user with that email → one INSERT (first time only).
 *
 * Run manually: `npm run ensure-admin-from-env`
 */
import '../src/bootstrap-env';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';
import { getPrismaMariaDbAdapterConfig } from '../src/core/database/database-url';

function readFromEnv(): { email: string; password: string } | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? '').trim();
  const any = Boolean(email) || password.length > 0;

  if (!any) {
    return null;
  }
  if (!email || !password) {
    throw new Error(
      'ensure-admin-from-env: set both ADMIN_EMAIL and ADMIN_PASSWORD, or leave both unset.',
    );
  }
  if (password.length < 8) {
    throw new Error('ensure-admin-from-env: ADMIN_PASSWORD must be at least 8 characters.');
  }
  return { email, password };
}

async function main(): Promise<void> {
  let bootstrap: { email: string; password: string } | null;
  try {
    bootstrap = readFromEnv();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }

  if (!bootstrap) {
    console.log(
      'ensure-admin-from-env: skipped (no ADMIN_EMAIL / ADMIN_PASSWORD; admin is not created).',
    );
    return;
  }

  const adapter = new PrismaMariaDb(getPrismaMariaDbAdapterConfig());
  const prisma = new PrismaClient({ adapter });

  console.log(
    'ensure-admin-from-env: checking DB (idempotent — only inserts if this email has no user yet).',
  );

  try {
    const existing = await prisma.user.findUnique({
      where: { email: bootstrap.email },
      select: { id: true, email: true, isAdmin: true },
    });

    if (existing) {
      if (!existing.isAdmin) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { isAdmin: true },
        });
        console.log(
          `ensure-admin-from-env: promoted existing user to admin (${bootstrap.email}).`,
        );
        return;
      }
      console.log(
        `ensure-admin-from-env: admin already exists (${bootstrap.email}) — skipping create (safe on every build).`,
      );
      return;
    }

    const hash = await hashPassword(bootstrap.password);
    const user = await prisma.user.create({
      data: {
        email: bootstrap.email,
        password: hash,
        isAdmin: true,
      },
    });
    console.log(`ensure-admin-from-env: created admin ${user.id} (${user.email}).`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      console.error('ensure-admin-from-env: email is already in use.');
    } else {
      console.error(e);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
