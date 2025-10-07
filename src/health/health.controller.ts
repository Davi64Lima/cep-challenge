import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get(process.env.HEALTH_PATH || '/health')
  health() {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
