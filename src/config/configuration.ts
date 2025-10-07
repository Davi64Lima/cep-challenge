export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  logLevel: process.env.LOG_LEVEL ?? 'info',
  requestIdHeader: process.env.REQUEST_ID_HEADER ?? 'x-request-id',

  httpTimeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS ?? '2000', 10),
  httpRetries: parseInt(process.env.HTTP_RETRIES ?? '0', 10),

  enableCache: (process.env.ENABLE_CACHE ?? 'true') === 'true',
  cacheTtlSec: parseInt(process.env.CACHE_TTL_SEC ?? '900', 10),

  enableSwagger: (process.env.ENABLE_SWAGGER ?? 'true') === 'true',
  swaggerPath: process.env.SWAGGER_PATH ?? '/docs',

  healthPath: process.env.HEALTH_PATH ?? '/health',
});
