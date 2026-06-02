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

function isDirectMysqlFamilyUrl(url) {
  return /^mysql:\/\//i.test(url) || /^mariadb:\/\//i.test(url);
}

/** Same rules as src/core/database/database-url.ts (plain Node for production build). */
function hasDatabaseConfig() {
  const direct =
    process.env.DATABASE_DIRECT_URL?.trim() || process.env.DIRECT_URL?.trim();
  if (direct && isDirectMysqlFamilyUrl(direct)) {
    return true;
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url && isDirectMysqlFamilyUrl(url)) {
    return true;
  }
  const user = process.env.DATABASE_USER?.trim();
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME?.trim();
  return Boolean(user && password !== undefined && password !== '' && database);
}

function main() {
  if (process.env.PRISMA_BUILD_SCHEMA_ONLY === '1') {
    throw new Error(
      'migrate-deploy: PRISMA_BUILD_SCHEMA_ONLY=1 skips DB for generate only. Unset it for migrate deploy, or run migrations separately with real DB env.',
    );
  }

  if (!hasDatabaseConfig()) {
    throw new Error(
      'migrate-deploy: database config required for migrations. Set DATABASE_URL (mysql://…), DATABASE_DIRECT_URL, or DATABASE_USER + DATABASE_PASSWORD + DATABASE_NAME on the build host.',
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
