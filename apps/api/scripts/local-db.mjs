import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
const dir = resolve('../../.local');
mkdirSync(dir, { recursive: true });
const credentials = resolve(dir, 'database.json');
const config = existsSync(credentials)
  ? JSON.parse(readFileSync(credentials, 'utf8'))
  : { password: randomBytes(24).toString('hex'), port: 55432 };
if (!existsSync(credentials))
  writeFileSync(credentials, JSON.stringify(config), { mode: 0o600 });
const databaseDir = resolve(dir, 'postgres');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'superpet',
  password: config.password,
  port: config.port,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient('postgres', '127.0.0.1');
await client.connect();
const result = await client.query(
  "select 1 from pg_database where datname='superpet'",
);
if (!result.rowCount) await client.query('create database superpet');
await client.end();
const envPath = resolve('.env');
if (!existsSync(envPath))
  writeFileSync(
    envPath,
    'PORT=3001\nHOST=127.0.0.1\nWEB_ORIGIN=http://localhost:3000\nDATABASE_URL=postgresql://superpet:' +
      config.password +
      '@127.0.0.1:' +
      config.port +
      '/superpet\nAPP_SECRET=' +
      randomBytes(32).toString('hex') +
      '\nOPERATION_EPOCH=' +
      randomUUID() +
      '\nMEDIA_DIR=' +
      resolve(dir, 'media').replaceAll('\\', '/') +
      '\n',
    { mode: 0o600 },
  );
console.log(
  'PostgreSQL local disponible en 127.0.0.1:' +
    config.port +
    '. Configuración privada en apps/api/.env.',
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 60000);
