import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';

let application: Promise<((req: unknown, res: unknown) => unknown)> | undefined;

async function bootstrap() {
  const app = await createApp(readConfig(process.env));
  await app.init();
  return app.getHttpAdapter().getInstance() as (req: unknown, res: unknown) => unknown;
}

export default async function handler(req: unknown, res: unknown) {
  application ??= bootstrap();
  return (await application)(req, res);
}
