import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { connectDatabase } from '../dist/db/database.js';
import { Auth } from '../dist/domain/auth.js';
import { Commerce } from '../dist/domain/commerce.js';
import { MediaController } from '../dist/http/media.js';
if (existsSync('.env')) loadEnvFile('.env');
const { db, pool } = connectDatabase(process.env.DATABASE_URL);
try {
  const auth = new Auth(
    db,
    process.env.WEB_ORIGIN,
    process.env.APP_SECRET,
    process.env.NODE_ENV === 'production',
  );
  await auth.cleanup();
  await new MediaController(
    new Commerce(db, process.env.OPERATION_EPOCH, process.env.APP_SECRET),
    auth,
  ).cleanup();
  console.log('Lote de mantenimiento completado.');
} finally {
  await pool.end();
}
