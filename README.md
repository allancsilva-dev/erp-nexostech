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

- Backend: NestJS, TypeScript, Drizzle, Redis/Keyv, BullMQ, JOSE, Decimal.js, opossum
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

## Correcoes Aplicadas (Auditoria)

Apos auditoria completa de aderencia aos prompts de especificacao, as seguintes correcoes foram aplicadas por ordem de prioridade:

| # | Scope | Descricao | Commit |
|---|-------|-----------|--------|
| 12 | Backend | SELECT FOR UPDATE elimina race condition em pagamentos concorrentes | `6df97b7` |
| 1 | Backend | Migration 013: FKs compostas `(category_id, branch_id)` previnem vazamento de dados entre filiais | `682eb58` |
| 2 | Backend | Onboarding de tenant com 12 passos sequenciais e rollback via DROP SCHEMA CASCADE | `48c295f` |
| 3 | Backend | Domain layer de reconciliacao: MatchAlgorithm (score por proximidade) + MatchRules (guards tipados) | `f26151a` |
| 4 | Backend | 6 codigos de erro de dominio faltantes (PAYMENT_EXCEEDS_BALANCE, BOLETO_ALREADY_GENERATED, etc.) | `fb4fcef` |
| 5 | Backend | Jobs BullMQ: payment-thanks (agradecimento pos-pagamento) e cleanup (purga semanal LGPD) | `f1dd8c8` |
| 6 | Backend | Listeners: AuditLogListener (8 eventos nao-HTTP) + NotificationListener (aprovacao/rejeicao/pagamento) | `2a3b3fe` |
| 7 | Backend | Circuit breaker opossum no StorageService: timeout 10s, threshold 50%, reset 30s | `94bd1db` |
| 8 | Backend | @CacheResult com SETNX atomico (anti-stampede), jitter ±10% e retry loop de 3s | `a87d2b1` |
| 9 | Backend | 19 permissoes financeiras corretamente seedadas no onboarding (verificado em BLOCO 2) | `48c295f` |
| 10 | Frontend | usePayEntry ja possuia onMutate/onError/onSettled — hook duplicado sem callbacks removido | `811594d` |
| 11 | Frontend | types/ criados em 8 features: approvals, audit, boletos, collection-rules, dashboard, reports, settings, transfers | `8ae5e6d` |

Para detalhes tecnicos de cada correcao, consulte:
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## Estado de Aderencia aos Prompts

### Prompt Backend

- Status: implementacao substancialmente corrigida e alinhada ao prompt apos auditoria.
- Cobertura principal: modulos de dominio, guards/interceptors, cache com anti-stampede, eventos, storage com circuit breaker, observabilidade, endpoints financeiros, isolamento multi-tenant por FK composta, race condition eliminada, onboarding completo.
- Pendencia estrutural: parte da camada de controllers permanece em `src/api/v1/controllers`, enquanto o prompt pede controllers por feature module.
- Pendencia de qualidade: lint backend possui erros ativos de tipagem estrita.

### Prompt Frontend

- Status: implementacao funcional com cobertura ampla dos requisitos.
- Cobertura principal: estrutura de rotas, providers, hooks, data layer, formularios, telas, loading states, RBAC com `PermissionGate`, optimistic updates, tipagem de dominio por feature, upload, Sentry, responsividade base.

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
