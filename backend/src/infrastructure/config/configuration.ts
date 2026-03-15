export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    env: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
    statementTimeoutMs: Number(
      process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 5000,
    ),
    poolMax: Number(process.env.DATABASE_POOL_MAX ?? 20),
    poolIdleTimeoutMs: Number(
      process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? 30000,
    ),
    poolConnectionTimeoutMs: Number(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? 10000,
    ),
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  auth: {
    jwksUrl: process.env.AUTH_JWKS_URL,
    audience: process.env.AUTH_JWT_AUDIENCE ?? process.env.AUTH_AUDIENCE,
    issuer: process.env.AUTH_JWT_ISSUER ?? process.env.AUTH_ISSUER,
  },
  boletos: {
    gatewayUrl: process.env.BOLETOS_GATEWAY_URL,
  },
  storage: {
    r2Endpoint: process.env.R2_ENDPOINT,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.R2_BUCKET_NAME,
    r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
  },
});
