/**
 * Production-safe `prisma migrate deploy` (plain Node — no ts-node).
 * Used by `npm run build` when devDependencies are not installed.
 */
require('dotenv/config');

const { execSync } = require('node:child_process');
const { join } = require('node:path');

const RECOVERABLE_MIGRATION = '20260602130000_simplify_user';
const backendRoot = join(__dirname, '..');

const DEFAULT_TZ = 'Europe/London';
const rawTz = process.env.TZ?.trim();
process.env.TZ = rawTz && rawTz.length > 0 ? rawTz : DEFAULT_TZ;

function run(command) {
  console.log(`\n> ${command}\n`);
  return execSync(command, {
    cwd: backendRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    encoding: 'utf8',
  });
}

function tryRun(command) {
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
    const output = [error.stdout, error.stderr, error.message]
      .filter(Boolean)
      .join('\n');
    return { ok: false, output };
  }
}

function isRecoverableDeployFailure(output) {
  const text = output.toLowerCase();
  return (
    text.includes(RECOVERABLE_MIGRATION.toLowerCase()) ||
    text.includes('p3018') ||
    text.includes("can't drop column") ||
    text.includes('failed migration') ||
    text.includes('failed to apply')
  );
}

function migrationLooksFailedInStatus(statusOutput) {
  const text = statusOutput.toLowerCase();
  return (
    text.includes('failed') &&
    text.includes(RECOVERABLE_MIGRATION.toLowerCase())
  );
}

function recoverFailedMigration() {
  console.log(
    `Recovering failed migration "${RECOVERABLE_MIGRATION}" before deploy…`,
  );
  run(`npx prisma migrate resolve --rolled-back ${RECOVERABLE_MIGRATION}`);
}

function main() {
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
