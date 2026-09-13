import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { connectDatabase } from '../dist/db/database.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { store, taxonomies } from '../dist/db/schema.js';
if (existsSync('.env')) loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const { db, pool } = connectDatabase(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
);
try {
  await migrate(db, { migrationsFolder: './drizzle' });
  await db
    .insert(store)
    .values({
      id: 1,
      data: {
        name: 'SuperPet',
        whatsappNumber: '',
        address: '',
        hours: '',
        deliveryAreaText: 'Ciudad de la Costa, Canelones, Uruguay',
        deliveryConditions:
          'Costo y disponibilidad de envío a coordinar por WhatsApp.',
      },
    })
    .onConflictDoNothing();
  for (const [name, slug] of [
    ['Alimentos', 'alimentos'],
    ['Accesorios', 'accesorios'],
    ['Juguetes', 'juguetes'],
    ['Higiene', 'higiene'],
  ])
    await db
      .insert(taxonomies)
      .values({ kind: 'category', name, slug })
      .onConflictDoNothing();
  console.log(
    'Migraciones aplicadas; configuración inicial disponible sin reemplazar datos existentes.',
  );
} finally {
  await pool.end();
}
