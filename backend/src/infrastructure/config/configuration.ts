export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    env: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
    statementTimeoutMs: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 5000),
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  auth: {
    jwksUrl: process.env.AUTH_JWKS_URL,
    audience: process.env.AUTH_AUDIENCE,
    issuer: process.env.AUTH_ISSUER,
  },
  boletos: {
    gatewayUrl: process.env.BOLETOS_GATEWAY_URL,
  },
});
