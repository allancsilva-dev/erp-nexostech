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

Aplicacao: `http://localhost:3000`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Variaveis de Ambiente

- `API_INTERNAL_URL` (serverFetch em Server Components)
- `NEXT_PUBLIC_SENTRY_DSN` (opcional no dev)

## Regras Implementadas (resumo)

- SSO sem tela de login (middleware + cookie `access_token`)
- Decode do JWT no server (`app/layout.tsx` + `lib/jwt.ts`)
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
- `/financeiro/configuracoes`
- `/admin/filiais`
- `/admin/usuarios`

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
