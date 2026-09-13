import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { Auth } from './domain/auth.js';
import { MediaController } from './http/media.js';

if (existsSync('.env')) loadEnvFile('.env');
const config = readConfig(process.env);
// Validate configuration before opening the listener.
const app = await createApp(config);
await app.listen(config.port, config.host);
if (config.databaseUrl) {
  try {
    await app.get(Auth).cleanup();
    await app.get(MediaController).cleanup(1);
  } catch {
    console.warn(
      'Mantenimiento inicial pendiente; reintentar con el comando maintenance.',
    );
  }
}
