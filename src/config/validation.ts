import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  REQUEST_ID_HEADER: Joi.string().default('x-request-id'),

  HTTP_TIMEOUT_MS: Joi.number().min(100).default(2000),
  HTTP_RETRIES: Joi.number().min(0).max(5).default(0),

  ENABLE_CACHE: Joi.boolean().truthy('true').falsy('false').default(true),
  CACHE_TTL_SEC: Joi.number().min(1).default(900),

  ENABLE_SWAGGER: Joi.boolean().truthy('true').falsy('false').default(true),
  SWAGGER_PATH: Joi.string().default('/docs'),

  HEALTH_PATH: Joi.string().default('/health'),
});
