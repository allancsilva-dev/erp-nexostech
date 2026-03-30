# ERP NexosTech

Monorepo do modulo financeiro do Nexos ERP, com backend em NestJS e frontend em Next.js.

## Estrutura

```text
erp-nexostech/
  backend/        API REST (NestJS)
  frontend/       App web (Next.js 14)
API local (dev): `http://localhost:3000/api/v1`
  prompt-frontend.md
```

## Stack

- Backend: NestJS, TypeScript, Drizzle, Redis/Keyv, BullMQ, JOSE, Decimal.js, opossum
- Frontend: Next.js 14, React 18, TypeScript strict, Tailwind, TanStack Query, RHF + Zod, Recharts
- Observabilidade: OpenTelemetry (backend) e Sentry (frontend)
App local: `http://localhost:3003`
## Execucao Local
### 3. Docker Compose

```bash
docker compose up --build
```

Servicos principais no compose:

- Frontend: `http://localhost:3003`
- Backend (host): `http://localhost:3004/api/v1`
- Redis: interno na rede `nexos_internal`

Observacao: no container, o backend escuta na porta `3001` e e publicado na host como `3004`.

### 1. Backend

```bash
cd backend
npm install
npm run start:dev
```

API: `http://localhost:3000/api/v1`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

## Scripts Principais

### Backend

- `npm run build`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Variaveis de Ambiente

Defina no minimo:

### Backend

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `AUTH_JWKS_URL`
- `AUTH_JWT_AUDIENCE`
- `AUTH_JWT_ISSUER`
- `AUTH_URL`
- `AUTH_INTERNAL_SECRET`

Observacao importante:

- `AUTH_JWT_ISSUER` deve ser o issuer literal do JWT (ex.: `auth.zonadev.tech`, sem `https://`).

### Frontend

- `API_INTERNAL_URL`
- `AUTH_URL`
- `NEXT_PUBLIC_AUTH_URL`
- `NEXT_PUBLIC_APP_AUDIENCE`
- `AUTH_COOKIE_NAME` (default: `erp_access_token`)
- `NEXT_PUBLIC_SENTRY_DSN` (opcional)

## Fluxo de Autenticacao (SSO)

1. Frontend verifica cookie `erp_access_token` no `frontend/src/middleware.ts`.
2. Sem token valido, tenta token exchange via cookie `zonadev_sid` em `AUTH_URL/api/oauth/token?aud=<APP_AUD>`.
3. Se exchange falhar, redireciona para login do Auth.
4. Chamadas client-side usam `/api/v1/*` no Next; o proxy `frontend/src/app/api/v1/[...path]/route.ts` injeta `Authorization: Bearer <erp_access_token>` quando necessario.
5. Backend valida JWT via RS256/JWKS (JwtGuard) e aplica RBAC por tenant (RbacGuard + cache Redis).
6. `SUPERADMIN` sem tenant pode acessar rotas de bootstrap (ex.: `/users/me`) e recebe perfil administrativo com `permissions: ['*']`.
7. `BranchGuard` aplica bypass para `ADMIN` antes de exigir `X-Branch-Id`.
# Nexos ERP

## Documentação

- Arquitetura: /docs/architecture
- API: /docs/api
- Backend: /docs/backend
- Frontend: /docs/frontend
- Fluxos: /docs/flows
