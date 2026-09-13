import { loadEnvFile } from 'node:process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { connectDatabase } from '../dist/db/database.js';
import { admins } from '../dist/db/schema.js';
import { passwordHash, passwordPolicy } from '../dist/domain/auth.js';
if (existsSync('.env')) loadEnvFile('.env');
if (process.env.NODE_ENV === 'production')
  throw new Error(
    'Este comando crea únicamente un administrador local de desarrollo.',
  );
const url = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1'].includes(url.hostname))
  throw new Error('Solo base local');
const { db, pool } = connectDatabase(url.toString());
try {
  const existing = await db.select().from(admins);
  if (existing.length)
    throw new Error('Ya existe un administrador; no se sobrescribe.');
  const password = randomBytes(24).toString('base64url');
  passwordPolicy(password);
  await db.insert(admins).values({
    username: 'superpet-local',
    passwordHash: await passwordHash(password),
  });
  const dir = resolve('../../.local');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, 'admin-local.txt'),
    'Solo desarrollo\nUsuario: superpet-local\nContraseña: ' + password + '\n',
    { mode: 0o600 },
  );
  console.log(
    'Administrador local creado. Credenciales en .local/admin-local.txt (no versionado).',
  );
} finally {
  await pool.end();
}
