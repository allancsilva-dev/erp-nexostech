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
- opossum (circuit breaker)

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

## Correcoes e Melhorias Aplicadas (Auditoria)

As correcoes abaixo foram aplicadas apos auditoria completa de aderencia ao `prompt-backed.md`:

### Consistencia de Dados

**Migration 013 — FKs Compostas para Isolamento de Filial** (`682eb58`)

Adicionadas chaves estrangeiras compostas `(category_id, branch_id)` e `(bank_account_id, branch_id)` na tabela `financial_entries`. Garante que uma entrada nao possa referenciar uma categoria ou conta bancaria de outra filial, mesmo que o `id` seja valido.

- Adiciona `UNIQUE(id, branch_id)` em `categories` e `bank_accounts`.
- Migration inclui bloco de verificacao previa que aborta em caso de violacoes existentes.

### Concorrencia

**SELECT FOR UPDATE em Pagamentos** (`6df97b7`)

O `payments.service.ts` passou a executar toda a logica de pagamento dentro de `txHelper.run()`, com `SELECT FOR UPDATE` na leitura do lancamento. Elimina race condition em que duas requisicoes concorrentes podiam aprovar um pagamento que excedia o saldo restante.

- Novo metodo `findEntryByIdForUpdate(entryId, branchId, tx)` no `PaymentsRepository`.
- Interface `SqlExecutor` permite compartilhar o executor entre repositorio e transacao.
- Eventos emitidos fora da transacao (apos commit).

### Onboarding de Tenant

**Onboarding Completo em 12 Passos** (`48c295f`)

O `TenantsRepository.create()` executa 12 passos sequenciais de inicializacao:

1. Criacao do schema PostgreSQL
2. Aplicacao de todas as migrations
3. Roles padrao (Admin, Financeiro, Vendas, Auditor) com `is_system=true`
4. Permissoes por role (19 permissoes financeiras no Admin)
5. Vinculo de permissoes
6. Vinculo do usuario administrador a role Admin
7. Filial Matriz (`is_headquarters=true`)
8. Vinculo do admin a Matriz
9. 10 categorias padrao (Vendas de Produtos, Fornecedores, etc.)
10. `financial_settings` com valores padrao
11. `document_sequences` com prefixo `NF-`
12. 6 regras de cobranca padrao (EMAIL, antes/no/apos vencimento + agradecimento)

DDL (schema + tabelas) executado antes da transacao. Todo DML encapsulado em `drizzleService.transaction()` com `DROP SCHEMA CASCADE` no bloco de erro.

### Dominio de Reconciliacao

**Domain Layer com MatchAlgorithm e MatchRules** (`f26151a`)

Criados dois arquivos de dominio puro em `modules/financial/reconciliation/domain/`:

- `match.algorithm.ts`: `MatchAlgorithm` com `findCandidates()` (tolerancia de ±1 centavo em valor e ±3 dias em data) e `bestMatch()` (pontuacao por proximidade de data).
- `match.rules.ts`: `MatchRules` com guards tipados: `assertItemNotReconciled`, `assertEntryEligible`, `assertAmountWithinTolerance`.

### Codigos de Erro

**6 Codigos de Erro Faltantes** (`fb4fcef`)

Adicionados/corrigidos os seguintes codigos de erro de dominio:

| Codigo | Contexto |
|--------|----------|
| `PAYMENT_EXCEEDS_BALANCE` | Pagamento maior que saldo restante |
| `BOLETO_ALREADY_GENERATED` | Boleto ACTIVE ja existe para o lancamento |
| `APPROVAL_SELF_FORBIDDEN` | Aprovador nao pode aprovar proprio lancamento |
| `APPROVAL_REQUIRED` | Lancamento aguarda aprovacao antes de pagar |
| `INVALID_PERIOD_OVERLAP` | Periodo de bloqueio sobrepoe periodo existente |
| `RECONCILIATION_AMOUNT_DIVERGENCE` | Valor do item diverge do lancamento alem da tolerancia |

### Jobs BullMQ

**Jobs payment-thanks e cleanup** (`f1dd8c8`)

Criados dois novos processors em `modules/financial/jobs/`:

- `PaymentThanksProcessor`: ativado pelo evento `payment.created`. Busca regra `ON_PAYMENT` ativa para a filial e insere um `collection_dispatch` agendado para envio imediato.
- `CleanupProcessor`: job semanal (domingo 03:00). Purga: categorias e contatos soft-deleted ha mais de 90 dias, `collection_dispatches` SENT/FAILED ha mais de 180 dias, `audit_logs` com mais de 2 anos (retencao LGPD).

Ambos sao idempotentes.

### Listeners de Eventos

**AuditLogListener e NotificationListener** (`2a3b3fe`)

Criados em `common/listeners/` e registrados no `AppModule`:

- `AuditLogListener`: complementa o `AuditInterceptor` para eventos fora do contexto HTTP (jobs, automacoes). Escuta 8 eventos de negocio e grava em `audit_logs` com idempotencia via `eventId` no metadata.
- `NotificationListener`: escuta `entry.approved`, `entry.rejected` e `payment.created`; enfileira jobs em `financial.notifications` e `financial.payment-thanks` sem bloquear o fluxo principal (falha silenciosa).

### Circuit Breaker

**opossum no StorageService** (`94bd1db`)

O metodo `uploadBuffer` do `StorageService` passou a ser protegido por um `CircuitBreaker` do `opossum`:

- Timeout por upload: 10 segundos
- Threshold para abertura: 50% de erros
- Reset automatico apos: 30 segundos
- Volume minimo antes de abrir: 5 requisicoes
- Logs de `warn`/`log` nos eventos `open`, `halfOpen` e `close`.

### Cache Anti-Stampede

**@CacheResult com SETNX + Jitter + Retry** (`a87d2b1`)

O decorator `@CacheResult` e o `CacheService` foram aprimorados:

- `CacheService.acquireLock(key, ttlMs)`: usa `SET NX PX` (atomico no Redis) para evitar que multiplas requisicoes concorrentes recomputem o mesmo valor simultaneamente.
- Jitter de ±10% no TTL evita expiracao sincronizada (thundering herd).
- Loop de retry de ate 3 segundos (60 × 50ms) enquanto o lock esta ativo.
- Fallback: se o lock expirar sem resultado no cache, computa diretamente.
- Double-check apos aquisicao do lock (outro processo pode ter populado enquanto aguardava).

### Seed de Permissoes

**19 Permissoes Financeiras no Onboarding** (verificado em `48c295f`)

A role `Admin` criada no onboarding recebe exatamente as 19 permissoes especificadas:

```
financial.dashboard.view
financial.entries.view / create / edit / pay / cancel / delete / approve
financial.categories.view / manage
financial.reconciliation.execute
financial.reports.view / export
financial.settings.manage
financial.audit.view
financial.bank_accounts.manage
financial.approval_rules.manage
admin.branches.manage
admin.users.manage
```

## Aderencia ao prompt-backed.md

Pontos implementados:
- Prefixo `/api/v1`
- Guards/interceptors globais
- Multi-tenant context/interceptor
- Cache com anti-stampede, filas, observabilidade e storage com circuit breaker
- Modulos financeiros e endpoints centrais
- Onboarding de tenant com 12 passos e rollback
- Isolamento de filial por FK composta no banco
- Race condition em pagamentos eliminada via SELECT FOR UPDATE
- Domain layer de reconciliacao (algoritmo + regras)
- Audit log para eventos HTTP (interceptor) e nao-HTTP (listener)
- 6 codigos de erro de dominio faltantes adicionados

Pendencias para 100% estrito:
- Realocacao completa da camada de controllers para o padrao 100% feature-based descrito no prompt.
- Zerar erros de lint estrito em todo o backend.
