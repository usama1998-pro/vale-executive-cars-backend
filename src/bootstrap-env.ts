import 'dotenv/config';

const DEFAULT_TZ = 'Europe/London';

const raw = process.env.TZ?.trim();
process.env.TZ = raw && raw.length > 0 ? raw : DEFAULT_TZ;
