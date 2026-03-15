import Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(1).default(5000),

  REDIS_URL: Joi.string().uri().required(),

  AUTH_JWKS_URL: Joi.string().uri().required(),
  AUTH_JWT_AUDIENCE: Joi.string().required(),
  AUTH_JWT_ISSUER: Joi.string().uri().required(),
  AUTH_AUDIENCE: Joi.string().optional(),
  AUTH_ISSUER: Joi.string().uri().optional(),

  BOLETOS_GATEWAY_URL: Joi.string().uri().optional(),

  R2_ENDPOINT: Joi.string().uri().optional(),
  R2_ACCESS_KEY_ID: Joi.string().optional(),
  R2_SECRET_ACCESS_KEY: Joi.string().optional(),
  R2_BUCKET_NAME: Joi.string().optional(),
  R2_PUBLIC_BASE_URL: Joi.string().uri().optional(),

  DATABASE_POOL_MAX: Joi.number().integer().min(1).default(20),
  DATABASE_POOL_IDLE_TIMEOUT_MS: Joi.number().integer().min(1).default(30000),
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1)
    .default(10000),
});
