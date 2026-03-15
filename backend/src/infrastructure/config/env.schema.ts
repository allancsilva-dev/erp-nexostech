import Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(1).default(5000),

  REDIS_URL: Joi.string().uri().required(),

  AUTH_JWKS_URL: Joi.string().uri().required(),
  AUTH_AUDIENCE: Joi.string().required(),
  AUTH_ISSUER: Joi.string().uri().required(),
});
