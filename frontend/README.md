# Frontend - Nexos ERP Financeiro

Aplicacao web do modulo financeiro do Nexos ERP.

## Tecnologias

- Next.js 14 (App Router)
- React 18 + TypeScript strict
- Tailwind CSS + componentes base estilo shadcn
- TanStack Query v5
- React Hook Form + Zod
- TanStack Table + TanStack Virtual
- Recharts
- Decimal.js
- next-themes
- nuqs
- Sentry (`@sentry/nextjs`)

## Estrutura

```text
src/
  middleware.ts
  app/
  components/
    layout/
    shared/
    ui/
  features/
    approvals/
      types/         approval.types.ts
    audit/
      types/         audit.types.ts
    boletos/
      types/         boleto.types.ts
    categories/
      types/
    collection-rules/
      types/         collection-rule.types.ts
    contacts/
      types/
    dashboard/
      types/         dashboard.types.ts
    entries/
      types/         entry.types.ts, entry.schemas.ts
    reconciliation/
      types/         reconciliation.types.ts
    reports/
      types/         report.types.ts
    settings/
      types/         settings.types.ts
    transfers/
      types/         transfer.types.ts
  hooks/
  lib/
  providers/
  styles/
```

## Inicializacao

```bash
npm install
npm run dev
```

Aplicacao: `http://localhost:3003`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Variaveis de Ambiente

- `API_INTERNAL_URL` (proxy Next `/api/v1/*` -> backend)
- `AUTH_URL`
- `NEXT_PUBLIC_AUTH_URL`
- `NEXT_PUBLIC_APP_AUDIENCE`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN` (opcional no dev)

Observacoes importantes:

- `AUTH_URL` e necessario para o middleware fazer token exchange server-side.
- `NEXT_PUBLIC_AUTH_URL` e usado em fluxos client-side (login/logout redirection).

## Regras Implementadas (resumo)

- SSO sem tela de login local (middleware + cookie `erp_access_token`)
- Token exchange via `zonadev_sid` em `AUTH_URL/api/oauth/token`
- `AuthProvider` client-side carregando `/api/v1/users/me`
- Proxy Next em `app/api/v1/[...path]/route.ts` com injecao automatica de Bearer a partir de cookie HttpOnly
- Logout local via `GET/POST /api/auth/local-logout`
- Redirect de login preserva path/query atual da app via `NEXT_PUBLIC_APP_URL` (fallback `https://erp.zonadev.tech`).
- Query keys centralizadas com isolamento por filial
- Data fetching via TanStack Query e clients centralizados (`lib/api-client.ts`, `lib/api-server.ts`)
- Formularios com RHF + Zod
- Calculos monetarios com `decimal.js`
- Listagens com estados loading/error/empty
- Sidebar com filtro por permissao
- `PermissionGate` aplicado em acoes criticas (criar, pagar, aprovar, cancelar)

## Rotas Principais

- `/dashboard`
- `/financeiro/contas-pagar`
- `/financeiro/contas-receber`
- `/financeiro/fluxo-caixa`
- `/financeiro/categorias`
- `/financeiro/conciliacao`
- `/financeiro/relatorios/*`
- `/financeiro/transferencias`
- `/financeiro/boletos`
- `/financeiro/aprovacoes`
- `/financeiro/auditoria`
- `/financeiro/regua-cobranca`
 - `/configuracoes`
- `/configuracoes/usuarios`
- `/configuracoes/roles`
- `/admin/filiais`
- `/admin/usuarios`

## Gestao de Acesso no Frontend

- `AuthProvider` expoe `user`, `permissions`, `branches`, `hasPermission`, `isAdmin`, `reload` e `logout`.
- `usePermissions` passa a usar o contexto de auth (nao consulta endpoint separado de permissoes do usuario).
- Sidebar inclui atalhos para configuracoes de usuarios e roles, controlados por `admin.users.manage`.
- Pagina `/configuracoes/usuarios` permite:
  - listar usuarios do tenant
  - adicionar usuario por email
  - trocar role de usuario
  - atualizar filiais vinculadas
- Pagina `/configuracoes/roles` permite:
  - listar/criar roles
  - editar permissoes por modulo
  - excluir role (quando permitido)

## Qualidade Atual

- `npm run lint`: OK
- `npm run build`: OK (com warnings nao bloqueantes de instrumentacao Sentry/OpenTelemetry)

## Correcoes e Melhorias Aplicadas (Auditoria)

As correcoes abaixo foram aplicadas apos auditoria completa de aderencia ao `prompt-frontend.md`:

### Optimistic Updates em Pagamentos

**usePayEntry com onMutate/onError/onSettled** (verificado — ja presente em `use-entries.ts`)

O hook `usePayEntry` em `features/entries/hooks/use-entries.ts` ja implementa o padrao completo de optimistic update:

- `onMutate`: cancela queries pendentes, captura snapshot anterior, aplica status `PAID` otimisticamente no cache.
- `onError`: reverte o cache para o snapshot capturado em `onMutate`.
- `onSettled`: invalida `entries.detail`, `entries.all` e `dashboard.all` apos confirmacao ou erro.

O arquivo `use-payments.ts` (duplicata sem essas callbacks) foi removido.

### Tipagem de Dominio por Feature (types/)

**types/ criados em 8 features** (`8ae5e6d`)

Todas as features agora possuem uma pasta `types/` com interfaces TypeScript de dominio:

| Feature | Arquivo | Tipos principais |
|---------|---------|-----------------|
| `approvals` | `approval.types.ts` | `ApprovalStatus`, `PendingApproval`, `ApprovalFilters` |
| `audit` | `audit.types.ts` | `AuditAction`, `AuditLog`, `AuditFilters` |
| `boletos` | `boleto.types.ts` | `BoletoStatus`, `Boleto`, `BoletoFilters` |
| `collection-rules` | `collection-rule.types.ts` | `RuleChannel`, `TriggerEvent`, `CollectionRule` |
| `dashboard` | `dashboard.types.ts` | `DashboardSummary`, `CashflowPoint`, `OverdueItem` |
| `reports` | `report.types.ts` | `DreSummary`, `AgingReport`, `CashflowRow` |
| `settings` | `settings.types.ts` | `BankAccount`, `LockPeriod`, `Role`, `FinancialSettings` |
| `transfers` | `transfer.types.ts` | `Transfer`, `CreateTransferInput`, `TransferFilters` |

Features que ja possuiam `types/`: `categories`, `contacts`, `entries`, `reconciliation`.

## Aderencia ao prompt-frontend.md

Implementacao funcional com cobertura ampla dos requisitos de arquitetura, UX, RBAC e data layer. Apos auditoria:

- Todos os dominios possuem tipagem explicita em `types/`
- Optimistic updates implementados no fluxo critico de pagamento
- `PermissionGate` aplicado em acoes criticas
- TanStack Query com query keys isoladas por filial

## Atualizacoes SSO + Acesso (Mar/2026)

Commits aplicados:

- `6aa92d8`: AuthProvider com `/users/me`, logout local e adaptacao de hooks/permissoes.
- `b742e25`: layout de configuracoes e pagina de gestao de usuarios.
- `baf0e39`: pagina de gestao de roles e permissoes.
- `3dcfe25`: middleware corrigido para token exchange em `/api/oauth/token`.

## Atualizacoes Financeiras Recentes (Mar/2026)

Commits aplicados:

- `efc03f6`: acoes de boleto integradas no detalhe do lancamento.
- `60c1b21`: listagem e remocao de anexos no detalhe do lancamento.
- `46ea3b4`: tipo `Entry` atualizado com campo `hasBoleto` para manter contrato com backend e restaurar build.

Impacto no fluxo de lancamentos:

- O detalhe de lancamento pode habilitar/ocultar acoes de boleto com base em `entry.hasBoleto`.
- Listagens continuam paginadas via `api.getList(...)` em React Query (`useEntries`), usando `placeholderData: keepPreviousData` para transicao suave.
- Contrato de API padronizado em proxy relativo (`/api/v1`) no cliente web.

## Fix Definitivo Pos-Redesign (Mar/2026)

Aplicado com commits isolados, lint em cada etapa e build final validado.

### Arquitetura de cookies confirmada

- `zonadev_sid`: cookie de sessao central emitido pelo Auth (`domain: .zonadev.tech`)
- `erp_access_token`: cookie scoped ao ERP, criado pelo middleware (`domain: erp.zonadev.tech`)
- O frontend ERP nao deve criar cookie generico `access_token` em `.zonadev.tech`

### Mudancas aplicadas

- `fix(auth): restore erp_access_token cookie with domain erp.zonadev.tech`
  - `src/middleware.ts` usa `COOKIE_NAME = 'erp_access_token'`
  - token exchange via `zonadev_sid` em `${AUTH_URL}/api/oauth/token?aud=...`
  - redirect para login com params `app` e `redirect`
- `fix(api): use relative API_BASE for proxy route`
  - `src/lib/api-client.ts` usa `const API_BASE = '/api/v1'`
- `fix(permissions): proxy AuthContext instead of independent fetch`
  - `src/providers/permission-provider.tsx` nao faz fetch proprio de permissoes
  - permissao vem de `AuthProvider`
- `fix(layout): fix hydration warnings and provider hierarchy`
  - `src/app/layout.tsx` com `suppressHydrationWarning`
  - `ThemeProvider` configurado com `attribute=class`, `defaultTheme=dark`, `enableSystem=false`
- `fix(hydration): add mounted guard to all useTheme consumers`
  - validado em todos consumidores atuais de `useTheme`
- `fix(auth): remove unused fetchMyPermissions`
  - `src/lib/api/auth.ts` sem fetch legado de permissoes

### Infraestrutura de porta

- Frontend padronizado na porta `3003`:
  - `package.json`: `next dev -p 3003` e `next start -p 3003`
  - `Dockerfile`: `EXPOSE 3003` + healthcheck em `localhost:3003`
  - `docker-compose.yml`: mapeamento `3003:3003`

### Validacao operacional recomendada

1. Limpar cookies de `erp.zonadev.tech`
2. Abrir `erp.zonadev.tech`
3. Verificar redirect para `auth.zonadev.tech/login?app=erp.zonadev.tech&redirect=...`
4. Login concluido deve retornar ao ERP com cookie `erp_access_token` no dominio `erp.zonadev.tech`
5. Confirmar ausencia de cookie `access_token` generico criado pelo ERP
6. Conferir chamadas para `/api/v1/branches/my` sem `401`
7. Validar ausencia de erros de hidratacao no console

## Estado de Qualidade

- `npm run lint`: OK
- `npm run build`: OK
