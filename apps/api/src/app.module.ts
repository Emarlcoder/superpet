import { Module } from '@nestjs/common';
import { HealthController, HealthService } from './health.js';

@Module({ controllers: [HealthController], providers: [HealthService] })
export class AppModule {}
