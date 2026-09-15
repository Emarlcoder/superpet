import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createApp } from '../dist/app.js';

// This entry point deliberately never loads .env, which may point to Neon.
const local = resolve('../../.local');
const database = JSON.parse(
  readFileSync(resolve(local, 'database.json'), 'utf8'),
);
const runtimeFile = resolve(local, 'dev-runtime.json');
if (!existsSync(runtimeFile))
  writeFileSync(
    runtimeFile,
    JSON.stringify({
      secret: randomBytes(32).toString('hex'),
      epoch: randomUUID(),
    }),
    { mode: 0o600 },
  );
const runtime = JSON.parse(readFileSync(runtimeFile, 'utf8'));
const databaseUrl = `postgresql://superpet:${encodeURIComponent(database.password)}@127.0.0.1:${database.port}/superpet`;
process.env.NODE_ENV = 'development';
process.env.MEDIA_PROVIDER = 'local';
process.env.MEDIA_DIR = resolve(local, 'media');
process.env.R2_ENDPOINT = '';
process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_UNPOOLED = databaseUrl;

if (process.argv.includes('--migrate')) {
  const { connectDatabase } = await import('../dist/db/database.js');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { db, pool } = connectDatabase(databaseUrl);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
  console.log('Migraciones aplicadas solo a PostgreSQL local.');
} else {
  const app = await createApp({
    host: '127.0.0.1',
    port: 3001,
    webOrigin: 'http://localhost:3000',
    databaseUrl,
    secret: runtime.secret,
    operationEpoch: runtime.epoch,
  });
  await app.listen(3001, '127.0.0.1');
  console.log(
    'API local: http://localhost:3001 — PostgreSQL y archivos locales.',
  );
}
