import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Verificar saúde da API',
    description: `
      Retorna o status de saúde da aplicação e suas dependências.
      
      **Verificações realizadas:**
      - Conectividade com ViaCEP
      - Conectividade com BrasilAPI
      - Uso de memória heap
      - Uso de memória RSS
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação saudável',
    schema: {
      example: {
        status: 'ok',
        info: {
          viacep: {
            status: 'up',
          },
          brasilapi: {
            status: 'up',
          },
          memory_heap: {
            status: 'up',
          },
          memory_rss: {
            status: 'up',
          },
        },
        error: {},
        details: {
          viacep: {
            status: 'up',
          },
          brasilapi: {
            status: 'up',
          },
          memory_heap: {
            status: 'up',
          },
          memory_rss: {
            status: 'up',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Aplicação com problemas',
    schema: {
      example: {
        status: 'error',
        info: {
          memory_heap: {
            status: 'up',
          },
        },
        error: {
          viacep: {
            status: 'down',
            message: 'Connection timeout',
          },
          brasilapi: {
            status: 'down',
            message: 'Service unavailable',
          },
        },
        details: {
          viacep: {
            status: 'down',
            message: 'Connection timeout',
          },
          brasilapi: {
            status: 'down',
            message: 'Service unavailable',
          },
          memory_heap: {
            status: 'up',
          },
        },
      },
    },
  })
  check() {
    return this.health.check([
      () =>
        this.http.pingCheck('viacep', 'https://viacep.com.br/ws/01310100/json'),
      () =>
        this.http.pingCheck(
          'brasilapi',
          'https://brasilapi.com.br/api/cep/v1/01310100',
        ),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB
    ]);
  }

  @Get('ready')
  @ApiExcludeEndpoint() // Não aparece no Swagger
  async readiness() {
    return { status: 'ready' };
  }

  @Get('live')
  @ApiExcludeEndpoint()
  async liveness() {
    return { status: 'alive' };
  }
}
