import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { API_PREFIX } from '@superpet/contracts';
import { AppModule } from './app.module.js';
import type { ApiConfig } from './config.js';
import { Module } from '@nestjs/common';
import { connectDatabase } from './db/database.js';
import { Commerce } from './domain/commerce.js';
import { Auth } from './domain/auth.js';
import { CommerceController } from './http/controller.js';
import { ErrorFilter } from './http/error-filter.js';
import helmet from 'helmet';
const helmetMiddleware = (
  typeof helmet === 'function'
    ? helmet
    : (helmet as unknown as { default: (options: object) => unknown }).default
) as (options: object) => unknown;
import { MediaController, MediaGuard } from './http/media.js';

export async function createApp(config: ApiConfig) {
  if (
    config.databaseUrl &&
    (!config.secret || config.secret.length < 32 || !config.operationEpoch)
  )
    throw new Error(
      'Database mode requires APP_SECRET (32+ characters) and OPERATION_EPOCH',
    );
  const connection = config.databaseUrl
    ? connectDatabase(config.databaseUrl)
    : null;
  @Module({
    imports: [AppModule],
    controllers: connection ? [CommerceController, MediaController] : [],
    providers: connection
      ? [
          MediaGuard,
          {
            provide: Commerce,
            useValue: new Commerce(
              connection.db,
              config.operationEpoch!,
              config.secret!,
            ),
          },
          {
            provide: Auth,
            useValue: new Auth(
              connection.db,
              config.webOrigin,
              config.secret!,
              process.env.NODE_ENV === 'production',
            ),
          },
          {
            provide: 'pool-lifecycle',
            useValue: { onApplicationShutdown: () => connection.pool.end() },
          },
        ]
      : [],
  })
  class RuntimeModule {}
  const app = await NestFactory.create(RuntimeModule, {
    logger: ['error', 'warn'],
    bodyParser: false,
  });
  const express = await import('express');
  app.use(
    helmetMiddleware({ crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  );
  app.use(express.default.json({ limit: '64kb' }));
  app.use(
    (
      _req: unknown,
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.useGlobalFilters(new ErrorFilter());
  app.setGlobalPrefix('/' + API_PREFIX);
  app.enableCors({
    origin: config.webOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'X-CSRF-Token',
      'Idempotency-Key',
      'X-Operation-Epoch',
    ],
    exposedHeaders: ['Retry-After', 'Idempotency-Replayed'],
  });
  app.enableShutdownHooks();
  return app;
}
