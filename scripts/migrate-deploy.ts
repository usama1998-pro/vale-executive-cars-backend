/**
 * Production-safe `prisma migrate deploy` used by `npm run build` and `migrate:deploy`.
 *
 * If `20260602130000_simplify_user` is stuck failed (P3018 / missing columns),
 * marks it rolled back once, then applies migrations (including the fixed SQL).
 */
import '../src/bootstrap-env';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const RECOVERABLE_MIGRATION = '20260602130000_simplify_user';
const backendRoot = join(__dirname, '..');

function run(command: string): string {
  console.log(`\n> ${command}\n`);
  return execSync(command, {
    cwd: backendRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    encoding: 'utf8',
  });
}

function tryRun(command: string): { ok: true; output: string } | { ok: false; output: string } {
  console.log(`\n> ${command}\n`);
  try {
    const output = execSync(command, {
      cwd: backendRoot,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
      encoding: 'utf8',
    });
    return { ok: true, output: output ?? '' };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n');
    return { ok: false, output };
  }
}

function isRecoverableDeployFailure(output: string): boolean {
  const text = output.toLowerCase();
  return (
    text.includes(RECOVERABLE_MIGRATION.toLowerCase()) ||
    text.includes('p3018') ||
    text.includes("can't drop column") ||
    text.includes('failed migration') ||
    text.includes('failed to apply')
  );
}

function migrationLooksFailedInStatus(statusOutput: string): boolean {
  const text = statusOutput.toLowerCase();
  return (
    text.includes('failed') &&
    text.includes(RECOVERABLE_MIGRATION.toLowerCase())
  );
}

function recoverFailedMigration(): void {
  console.log(
    `Recovering failed migration "${RECOVERABLE_MIGRATION}" before deploy…`,
  );
  run(`npx prisma migrate resolve --rolled-back ${RECOVERABLE_MIGRATION}`);
}

function main(): void {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      'migrate-deploy: DATABASE_URL is required (or DB_* vars that build it).',
    );
  }

  const status = tryRun('npx prisma migrate status');
  if (status.ok && migrationLooksFailedInStatus(status.output)) {
    recoverFailedMigration();
  }

  const deploy = tryRun('npx prisma migrate deploy');
  if (deploy.ok) {
    console.log('\nMigrations applied successfully.\n');
    return;
  }

  if (!isRecoverableDeployFailure(deploy.output)) {
    process.stderr.write(deploy.output);
    throw new Error('prisma migrate deploy failed (non-recoverable error).');
  }

  recoverFailedMigration();
  run('npx prisma migrate deploy');
  console.log('\nMigrations applied successfully after recovery.\n');
}

main();
