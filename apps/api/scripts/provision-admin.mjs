import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { connectDatabase } from '../dist/db/database.js';
import { admins } from '../dist/db/schema.js';
import {
  Auth,
  passwordHash,
  passwordPolicy,
  passwordVerify,
} from '../dist/domain/auth.js';
if (existsSync('.env')) loadEnvFile('.env');
if (!process.stdin.isTTY)
  throw new Error(
    'Se requiere una terminal privada interactiva; no se aceptan contraseñas en argumentos.',
  );
if (
  !process.env.RESEND_API_KEY ||
  !process.env.MAIL_FROM ||
  !process.env.WEB_ORIGIN ||
  !process.env.APP_SECRET
)
  throw new Error(
    'Configurá correo, origen y secreto antes de aprovisionar la cuenta.',
  );
let hidden = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!hidden) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
async function askSecret(label) {
  process.stdout.write(label);
  hidden = true;
  try {
    return await rl.question('');
  } finally {
    hidden = false;
    process.stdout.write('\n');
  }
}
const { db, pool } = connectDatabase(process.env.DATABASE_URL);
try {
  const username = (await rl.question('Usuario: ')).trim().toLowerCase();
  z.string().min(1).max(120).parse(username);
  const email = z
    .email()
    .max(254)
    .parse(
      (await rl.question('Correo de recuperación a verificar: '))
        .trim()
        .toLowerCase(),
    );
  const [existing] = await db.select().from(admins);
  let adminId;
  if (existing) {
    if (
      !process.argv.includes('--verify-email') ||
      existing.username !== username
    )
      throw new Error(
        'Ya existe una cuenta. Para verificar o cambiar su correo usá --verify-email con su usuario actual.',
      );
    const current = await askSecret('Contraseña actual (oculta): ');
    if (!(await passwordVerify(existing.passwordHash, current)))
      throw new Error('Credenciales inválidas.');
    adminId = existing.id;
  } else {
    const password = await askSecret(
      'Contraseña nueva (oculta, 8–128 caracteres): ',
    );
    if (password !== (await askSecret('Repetir contraseña (oculta): ')))
      throw new Error('Las contraseñas no coinciden.');
    passwordPolicy(password, username);
    const hashed = await passwordHash(password);
    adminId = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(72819461)`);
      if ((await tx.select().from(admins)).length)
        throw new Error('Ya existe una cuenta.');
      const [created] = await tx
        .insert(admins)
        .values({ username, passwordHash: hashed })
        .returning();
      return created.id;
    });
  }
  const auth = new Auth(
    db,
    process.env.WEB_ORIGIN,
    process.env.APP_SECRET,
    process.env.NODE_ENV === 'production',
  );
  const result = await auth.deliver(adminId, 'verify', email);
  console.log(
    result.status === 'accepted'
      ? 'Proveedor aceptó el mensaje de verificación; la casilla se habilita al confirmar el enlace.'
      : 'Envío no confirmado. La cuenta no cambia de correo hasta verificarlo; podés reintentar este comando con --verify-email.',
  );
} finally {
  rl.close();
  await pool.end();
}
