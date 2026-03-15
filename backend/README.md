# Backend - Nexos ERP Financeiro

API REST do modulo financeiro do Nexos ERP.

## Tecnologias

- NestJS 11
- TypeScript
- Drizzle ORM + PostgreSQL
- Redis/Keyv (cache)
- BullMQ (filas/jobs)
- JOSE (JWT/JWKS)
- Decimal.js (calculos financeiros)
- OpenTelemetry (observabilidade)

## Estrutura Atual

```text
src/
  app.module.ts
  main.ts
  api/v1/                  controladores e modulo de versao da API
  common/                  guards, interceptors, decorators, filtros, listeners
  infrastructure/          database, cache, queue, storage, observability
  modules/                 regras de negocio por dominio
```

## Inicializacao

```bash
npm install
npm run start:dev
```

Servidor: `http://localhost:3000`

Prefixo global: `/api/v1`

## Scripts

- `npm run build`
- `npm run start:dev`
- `npm run start:prod`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run migration:apply`
- `npm run migration:retry`

## Variaveis de Ambiente (minimas)

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWKS_URL`
- `R2_*` (quando upload estiver ativo)

## Modulos de Negocio

- `modules/branches`
- `modules/contacts`
- `modules/rbac`
- `modules/tenants`
- `modules/financial/*`:
  - entries
  - payments
  - categories
  - bank-accounts
  - reports
  - dashboard
  - transfers
  - approvals
  - boletos
  - collection-rules
  - lock-periods
  - settings
  - audit

## Endpoints Principais

- `GET /api/v1/entries`
- `POST /api/v1/entries`
- `POST /api/v1/entries/:id/pay`
- `POST /api/v1/entries/:id/cancel`
- `POST /api/v1/entries/:id/refund`
- `GET /api/v1/categories`
- `GET /api/v1/contacts`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/reports/dre`
- `GET /api/v1/transfers`
- `POST /api/v1/transfers`

## Qualidade Atual

- Build: `npm run build` OK
- Lint: `npm run lint` com erros de tipagem estrita em partes do projeto

## Aderencia ao prompt-backed.md

Pontos implementados:
- Prefixo `/api/v1`
- Guards/interceptors globais
- Multi-tenant context/interceptor
- Cache, filas, observabilidade e storage
- Modulos financeiros e endpoints centrais

Pendencias para 100% estrito:
- Realocacao completa da camada de controllers para o padrao 100% feature-based descrito no prompt.
- Zerar erros de lint estrito em todo o backend.

