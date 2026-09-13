export interface ApiConfig {
  port: number;
  host: string;
  webOrigin: string;
  databaseUrl?: string;
  operationEpoch?: string;
  secret?: string;
}

export function readConfig(env: NodeJS.ProcessEnv): ApiConfig {
  const rawPort = env.PORT ?? '3001';
  if (
    !/^\d+$/.test(rawPort) ||
    Number(rawPort) < 1 ||
    Number(rawPort) > 65535
  ) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const origin = new URL(env.WEB_ORIGIN ?? 'http://localhost:3000');
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.origin !== (env.WEB_ORIGIN ?? 'http://localhost:3000')
  ) {
    throw new Error('WEB_ORIGIN must be an exact HTTP origin without a path');
  }
  if (
    env.NODE_ENV === 'production' &&
    (!env.WEB_ORIGIN || origin.protocol !== 'https:')
  ) {
    throw new Error('Production requires an explicit HTTPS WEB_ORIGIN');
  }
  return {
    port: Number(rawPort),
    host: env.HOST ?? '127.0.0.1',
    webOrigin: origin.origin,
    ...(env.DATABASE_URL ? { databaseUrl: env.DATABASE_URL } : {}),
    ...(env.OPERATION_EPOCH ? { operationEpoch: env.OPERATION_EPOCH } : {}),
    ...(env.APP_SECRET ? { secret: env.APP_SECRET } : {}),
  };
}
