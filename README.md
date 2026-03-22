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
8. Logout local limpa cookie HttpOnly via `GET/POST /api/auth/local-logout`.

## Gestao de Acesso (Usuarios e Roles)

Backend (novos endpoints principais):

- `GET /api/v1/users/me`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:userId/branches`
- `GET /api/v1/permissions`
- `PATCH /api/v1/roles/:id/permissions`

Observacoes importantes:

- `GET /api/v1/users/me` retorna `user`, `permissions` e `branches`.
- Quando usuario nao esta provisionado no tenant, retorna `403` com codigo `USER_NOT_PROVISIONED`.
- `PATCH /api/v1/roles/:id/permissions` usa transacao para evitar estado parcial.
- Permissoes sao validadas contra `SYSTEM_PERMISSIONS` antes de salvar.
- Mudancas de role/permissoes invalidam cache RBAC (`rbac:<tenantId>:<userId>`).
- Nao existe tabela `permissions`; os codigos ficam em `role_permissions` e no catalogo de sistema.
- Migration multi-tenant adiciona `email` em `user_roles` para cache de exibicao.

Frontend (novas telas):

- `/configuracoes/usuarios`
- `/configuracoes/roles`

As paginas usam proxy `/api/v1/*`, TanStack Query e protecao por permissao `admin.users.manage`.

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

## Atualizacoes SSO + Acesso (Mar/2026)

| Scope | Descricao | Commit |
|---|---|---|
| Backend | GET `/users/me` com roles+permissions (query otimizada) e branches | `d00363c` |
| Backend | Migration multi-tenant: coluna `email` em `user_roles` | `b0ff818` |
| Backend | Catalogo `SYSTEM_PERMISSIONS` e endpoint `GET /permissions` | `2a99510` |
| Backend | CRUD de usuarios + patch de permissions com transacao e invalidacao de cache | `35273f1` |
| Frontend | AuthProvider com `/users/me`, proxy bearer injection e local-logout | `6aa92d8` |
| Frontend | Pagina de gestao de usuarios | `b742e25` |
| Frontend | Pagina de gestao de roles/permissoes | `baf0e39` |

### Hotfixes de Autenticacao SSO (Mar/2026)

| Scope | Descricao | Commit |
|---|---|---|
| Frontend | Middleware: token exchange corrigido para `/api/oauth/token` e redirect para URL atual da app | `3dcfe25` |
| Backend | Config: `AUTH_JWT_ISSUER` sem validacao Joi `.uri()` | `1fa4f5a` |
| Backend | TenantInterceptor: rota `/users/me` permitida para `SUPERADMIN` sem tenant | `f1d9c64` |
| Backend | RolesService: early return em `/users/me` para `SUPERADMIN` sem tenant (`permissions: ['*']`) | `af573e5` |
| Backend | BranchGuard: bypass de `ADMIN` antes da validacao de `X-Branch-Id` | `1bf4564` |
| Backend | AllExceptionsFilter: log de erro interno com `console.error` antes do 500 | `5bd6348` |
| Backend | Migration runner: sanitizacao de schema de tenant com `_` (consistente com TenantContextService) | `6e4b79a` |

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
