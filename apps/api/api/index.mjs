// Load the build emitted by tsc so Nest receives its decorator metadata.
import { createApp } from '../dist/app.js';
import { readConfig } from '../dist/config.js';

let application;

async function bootstrap() {
  // Vercel owns the listener and may set PORT to an internal socket path.
  const env = { ...process.env };
  delete env.PORT;
  const app = await createApp(readConfig(env));
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req, res) {
  application ??= bootstrap().catch((error) => {
    application = undefined;
    throw error;
  });
  return (await application)(req, res);
}
