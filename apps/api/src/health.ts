import { Controller, Get, Header, Injectable } from '@nestjs/common';
import type { HealthResponse } from '@superpet/contracts';

@Injectable()
export class HealthService {
  status(): HealthResponse {
    return { status: 'ok', service: 'superpet-api' };
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  get(): HealthResponse {
    return this.health.status();
  }
}
