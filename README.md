# ERP NexosTech

Monorepo do modulo financeiro do Nexos ERP, com backend em NestJS e frontend em Next.js.

## Estrutura

```text
erp-nexostech/
	backend/        API REST (NestJS)
	frontend/       App web (Next.js 14)
	prompt-backed.md
	prompt-frontend.md
```

## Stack

- Backend: NestJS, TypeScript, Drizzle, Redis/Keyv, BullMQ, JOSE, Decimal.js
- Frontend: Next.js 14, React 18, TypeScript strict, Tailwind, TanStack Query, RHF + Zod, Recharts
- Observabilidade: OpenTelemetry (backend) e Sentry (frontend)

## Execucao Local

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
- `npm run start:dev`
- `npm run lint`
- `npm run test`
- `npm run migration:apply`

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
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWKS_URL`

### Frontend

- `API_INTERNAL_URL` (SSR/serverFetch)
- `NEXT_PUBLIC_SENTRY_DSN` (opcional em desenvolvimento)

## Fluxo de Autenticacao (SSO)

1. Frontend verifica cookie `access_token` no `middleware.ts`.
2. Sem token ou token expirado: redirect para `https://auth.zonadev.tech`.
3. Com token valido, frontend renderiza e backend valida JWT/JWKS.

## Estado de Aderencia aos Prompts

### Prompt Frontend

- Status: alto nivel funcional implementado e build/lint passando.
- Cobertura principal: estrutura de rotas, providers, hooks, data layer, formularios, telas, loading states, RBAC com `PermissionGate`, upload, Sentry, responsividade base.

### Prompt Backend

- Status: parcialmente implementado.
- Cobertura principal: modulos de dominio, guards/interceptors, cache, eventos, storage, observabilidade, endpoints financeiros e prefixo `/api/v1`.
- Pendencia estrutural relevante: parte da camada de controllers permanece em `src/api/v1/controllers`, enquanto o prompt pede controllers por feature module.
- Pendencia de qualidade: lint backend possui erros ativos de tipagem estrita.

## Qualidade Atual

### Frontend

- `npm run lint`: OK
- `npm run build`: OK (com warnings nao bloqueantes de instrumentacao)

### Backend

- `npm run build`: OK
- `npm run lint`: com erros de tipagem/seguranca (`typescript-eslint`)

## Referencias

- Especificacao backend: `prompt-backed.md`
- Especificacao frontend: `prompt-frontend.md`

