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

## Aderencia ao prompt-frontend.md

Implementacao funcional com cobertura ampla dos requisitos de arquitetura, UX, RBAC e data layer.

