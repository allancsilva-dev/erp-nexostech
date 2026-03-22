# NEXOS ERP — Prompt de Construção do FRONTEND (Módulo Financeiro MVP v3.3)

> **Objetivo**: Este prompt contém TODAS as instruções necessárias para construir o frontend do Módulo Financeiro do Nexos ERP. O backend já está sendo construído separadamente. Este prompt é auto-contido — siga cada seção na ordem indicada. Não invente telas ou funcionalidades que não estão aqui.

---

## 1. CONTEXTO

O **Nexos ERP** é uma plataforma SaaS white-label para gestão empresarial. O frontend consome a API REST do backend NestJS em `/api/v1`. O sistema opera como cliente SSO do **ZonaDev Auth** (`auth.zonadev.tech`) — não existe tela de login.

O domínio é `erp.zonadev.tech`. O frontend é o Módulo Financeiro: contas a pagar/receber, dashboard, fluxo de caixa, conciliação bancária, relatórios (DRE, balancete, aging), aprovações, boletos, transferências, régua de cobrança, categorias, contas bancárias, configurações e auditoria.

---

## 2. STACK (não alterar)

| Tecnologia | Versão / Uso |
|---|---|
| **Next.js 14** | App Router (`app/`), Server Components por padrão, Client Components onde necessário |
| **TypeScript** | Strict mode (`strict: true` no tsconfig) — sem `any` em nenhum lugar |
| **Tailwind CSS** | Estilização utility-first — sem CSS modules, sem styled-components |
| **shadcn/ui** | Componentes base (Button, Dialog, Table, Select, Input, Tabs, Badge, Card, Skeleton, Toast, etc.) |
| **TanStack Query v5** | Data fetching, cache, mutations, invalidação — TODA chamada à API |
| **react-hook-form + zod** | Formulários + validação client-side com schemas tipados |
| **@tanstack/react-table** | Headless table engine (sorting, pagination, selection, column visibility) |
| **@tanstack/react-virtual** | Virtualização de linhas para tabelas grandes (ativar quando `total > 300`) |
| **recharts** | Gráficos (linha, barras, donut) — dashboard e relatórios. **Máximo 24 data points por gráfico** |
| **react-number-format** | Máscara monetária (centavos como inteiro, exibição R$ 1.500,00) |
| **react-input-mask** | Máscaras de input: CPF, CNPJ, telefone, CEP |
| **decimal.js** | Cálculos monetários no frontend (ex: soma de itens, preview de parcelas) |
| **jose** | Decode seguro de JWT (sem validar assinatura) — substitui decode manual |
| **date-fns** | Formatação e manipulação de datas (`pt-BR` locale) |
| **lucide-react** | Ícones |
| **next-themes** | Toggle claro/escuro (class strategy, persiste em cookie + localStorage) |
| **nuqs** | Query params tipados na URL (filtros de listagem sincronizados com URL) |

### Regras da stack
- **Valores monetários são SEMPRE `string`** — nunca converter para `number` para calcular
- **Cálculos no frontend usam `decimal.js`** — nunca operadores nativos (`+`, `-`, `*`, `/`)
- **Sem `any`** — usar tipos explícitos ou `unknown` + type guard
- **Sem CSS-in-JS** — apenas Tailwind classes
- **Sem Redux, Zustand, Jotai** — estado do servidor via TanStack Query, estado local via React state/context

---

## 3. AUTENTICAÇÃO (SSO — sem tela de login)

O Nexos ERP **não possui tela de login**. O fluxo é:

1. Usuário acessa `erp.zonadev.tech`
2. Middleware Next.js verifica se cookie `access_token` **existe**
3. Sem cookie → redirect para `auth.zonadev.tech?aud=erp.zonadev.tech&redirect=/dashboard`
4. Usuário faz login no ZonaDev Auth
5. Auth emite JWT RS256 via cookie HTTP-only (`domain=.zonadev.tech`)
6. Redirect de volta → middleware encontra cookie → permite acesso

### Middleware Next.js

**LOCALIZAÇÃO**: `middleware.ts` fica na **raiz do `src/`**, NUNCA dentro de `app/`. Essa é a regra do Next.js App Router.

```
src/
├── middleware.ts          # ← AQUI (raiz do src)
├── app/
│   ├── layout.tsx
│   └── ...
```

**O middleware APENAS verifica se o cookie existe**. Ele roda no Edge Runtime — muitas libs de JWT não funcionam lá. Nenhum decode, nenhuma validação.

```typescript
// src/middleware.ts (RAIZ do src — nunca dentro de app/)
import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose'; // jose funciona no Edge Runtime

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const loginUrl = new URL('https://auth.zonadev.tech');
  loginUrl.searchParams.set('aud', 'erp.zonadev.tech');
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);

  // Sem cookie → redirect para login
  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  // Token expirado → redirect para login (evita entrar no sistema com token vencido)
  // NÃO valida assinatura — apenas checa exp para UX (backend é quem valida de verdade)
  try {
    const payload = decodeJwt(token); // jose funciona no Edge Runtime
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // Token malformado → redirect para login
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

### AuthProvider — decode do JWT no SERVER (HTTP-only cookie não é legível por JS)

**PROBLEMA**: O ZonaDev Auth emite cookie `HTTP-only`. JavaScript (`document.cookie`) **NÃO consegue ler** cookies HTTP-only. Portanto, o decode do JWT **DEVE acontecer no Server Component** (`layout.tsx`), não no client.

```typescript
// lib/jwt.ts — utilitário de decode (roda no server)
import { decodeJwt } from 'jose'; // Biblioteca mantida, segura, funciona em Node e Edge

interface AuthUser {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  plan: string;
}

export function decodeToken(token: string): AuthUser | null {
  try {
    // jose.decodeJwt() faz decode seguro do payload sem validar assinatura
    // Trata base64url, padding, unicode — tudo que o decode manual erra
    // NÃO valida assinatura — isso é responsabilidade do backend
    // Usar APENAS para exibição (nome, email) — NUNCA para lógica de segurança
    const payload = decodeJwt(token);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Verifica se o token está expirado (sem validar assinatura).
 * Usado no middleware para evitar que usuário entre com token vencido.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) return false; // Sem exp = não expira (raro)
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // Token inválido = considerar expirado
  }
}
```

```typescript
// app/layout.tsx — Server Component lê o cookie HTTP-only e passa para o provider
import { cookies } from 'next/headers';
import { decodeToken } from '@/lib/jwt';
import { AuthProvider } from '@/providers/auth-provider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  const user = token ? decodeToken(token) : null;

  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider initialUser={user}>
          {/* outros providers */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

```typescript
// providers/auth-provider.tsx — Client Component recebe user já decodificado
'use client';

import { createContext, useContext } from 'react';

interface AuthUser {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  plan: string;
}

const AuthContext = createContext<AuthUser | null>(null);

interface Props {
  initialUser: AuthUser | null;
  children: React.ReactNode;
}

export function AuthProvider({ initialUser, children }: Props) {
  // Recebe user já decodificado do Server Component
  // NÃO tenta ler document.cookie (HTTP-only não é acessível)
  return <AuthContext.Provider value={initialUser}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

**REGRAS**:
- `layout.tsx` (Server Component): lê cookie HTTP-only via `cookies()`, decodifica JWT, passa como prop
- `AuthProvider` (Client Component): recebe `initialUser` pronto — zero acesso a cookie
- Decode é APENAS para exibição (nome, email, plan) — NUNCA para lógica de segurança
- Toda autorização real acontece no backend via JWT validado com JWKS

| Claim | Uso no frontend |
|---|---|
| `sub` | ID do usuário |
| `email` | Exibir no header / user menu |
| `name` | Exibir no header |
| `tenantId` | Interno (não exibido) |
| `roles` | `["ADMIN"]` — role base do Auth |
| `plan` | `PRO` — exibir/esconder features por plano |

**REGRAS**:
- Middleware: APENAS verifica se cookie existe. Roda no Edge Runtime.
- AuthProvider: decode do payload (base64). Roda no client.
- Backend: valida assinatura RS256 via JWKS. Única fonte de verdade.

---

## 4. ESTRUTURA DE PASTAS (seguir exatamente)

```
src/
├── middleware.ts                         # ← AUTH REDIRECT (raiz do src, NUNCA em app/)
│
├── app/                                 # Next.js App Router
│   ├── layout.tsx                       # Root layout (providers, header, sidebar)
│   ├── error.tsx                        # Error boundary global (catch de crashes)
│   ├── not-found.tsx                    # Página 404 customizada
│   ├── dashboard/
│   │   ├── page.tsx                     # Dashboard financeiro
│   │   └── loading.tsx                  # Skeleton do dashboard (Suspense)
│   ├── financeiro/
│   │   ├── contas-pagar/
│   │   │   ├── page.tsx                 # Listagem contas a pagar
│   │   │   ├── loading.tsx              # Skeleton da listagem
│   │   │   ├── nova/
│   │   │   │   └── page.tsx             # Formulário nova conta
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # Detalhe / edição
│   │   │       └── pagamentos/
│   │   │           └── page.tsx         # Histórico de pagamentos da entry
│   │   ├── contas-receber/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── nova/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── fluxo-caixa/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── categorias/
│   │   │   └── page.tsx
│   │   ├── conciliacao/
│   │   │   └── page.tsx
│   │   ├── relatorios/
│   │   │   ├── page.tsx                 # Seleção de relatório
│   │   │   ├── dre/
│   │   │   │   └── page.tsx
│   │   │   ├── balancete/
│   │   │   │   └── page.tsx
│   │   │   └── aging/
│   │   │       └── page.tsx
│   │   ├── transferencias/
│   │   │   └── page.tsx
│   │   ├── boletos/
│   │   │   └── page.tsx
│   │   ├── aprovacoes/
│   │   │   └── page.tsx
│   │   ├── auditoria/
│   │   │   └── page.tsx
│   │   ├── regua-cobranca/
│   │   │   └── page.tsx
│   │   └── configuracoes/
│   │       └── page.tsx
│   └── admin/
│       ├── filiais/
│       │   └── page.tsx
│       └── usuarios/
│           └── page.tsx
│
├── components/                          # Componentes COMPARTILHADOS (sem lógica de negócio)
│   ├── ui/                              # shadcn/ui (gerado via CLI — não editar diretamente)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── select.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── tabs.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── command.tsx                  # Autocomplete (fornecedor/cliente)
│   │   └── ...
│   │
│   ├── layout/                          # Layout shell
│   │   ├── header.tsx                   # Header com user info + branch switcher + theme toggle
│   │   ├── sidebar.tsx                  # Menu lateral colapsável (expanded 256px / collapsed 64px)
│   │   ├── branch-switcher.tsx          # Dropdown de troca de filial
│   │   ├── theme-toggle.tsx             # Toggle claro/escuro (salva em localStorage + cookie)
│   │   ├── user-menu.tsx                # Menu do usuário (perfil, logout)
│   │   └── page-header.tsx              # Título da página + breadcrumb + ações
│   │
│   └── shared/                          # Componentes genéricos reutilizáveis (sem lógica de domínio)
│       ├── data-table.tsx               # Tabela paginada — @tanstack/react-table (headless) + server-driven
│       ├── currency-input.tsx           # Input monetário (centavos → "R$ 1.500,00" → envia "1500.00")
│       ├── document-input.tsx           # Input CPF/CNPJ (detecta pelo tamanho, aplica máscara)
│       ├── phone-input.tsx              # Input telefone com máscara (00) 00000-0000
│       ├── cep-input.tsx                # Input CEP com máscara 00000-000
│       ├── date-picker.tsx              # Date picker que envia YYYY-MM-DD e exibe DD/MM/YYYY
│       ├── status-badge.tsx             # Badge de status com cores por status
│       ├── category-badge.tsx           # Badge de categoria com cor
│       ├── money-display.tsx            # Exibe valor formatado (R$ 1.500,00)
│       ├── empty-state.tsx              # Estado vazio (ícone + mensagem + CTA)
│       ├── error-banner.tsx             # Banner de erro com retry
│       ├── confirm-dialog.tsx           # Dialog de confirmação (cancelar, excluir, estornar)
│       ├── file-upload.tsx              # Upload de anexo (presigned URL → R2, com retry + progress)
│       ├── permission-gate.tsx          # Renderiza children apenas se usuário tem permissão
│       └── loading-skeleton.tsx         # Skeletons genéricos (table, cards, form)
│
├── features/                            # FEATURE MODULES — cada feature é auto-contida
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── dashboard-client.tsx     # Client component principal (hydration target)
│   │   │   ├── summary-cards.tsx
│   │   │   ├── cashflow-chart.tsx       # recharts LineChart
│   │   │   ├── expense-donut.tsx        # recharts PieChart
│   │   │   └── overdue-list.tsx
│   │   └── hooks/
│   │       └── use-dashboard.ts         # useDashboardSummary, useCashflowChart, etc.
│   │
│   ├── entries/                         # Lançamentos (contas a pagar + receber)
│   │   ├── components/
│   │   │   ├── entries-table.tsx
│   │   │   ├── entry-form/             # Formulário dividido (evitar 600+ linhas)
│   │   │   │   ├── index.tsx           #   Form raiz (react-hook-form + zodResolver)
│   │   │   │   ├── basic-info.tsx
│   │   │   │   ├── financial-info.tsx
│   │   │   │   ├── dates-info.tsx
│   │   │   │   ├── installment-section.tsx
│   │   │   │   └── attachments-section.tsx
│   │   │   ├── entry-detail.tsx
│   │   │   ├── entry-filters.tsx
│   │   │   ├── payment-modal.tsx
│   │   │   ├── cancel-modal.tsx
│   │   │   ├── refund-modal.tsx
│   │   │   └── batch-pay-bar.tsx
│   │   ├── hooks/
│   │   │   ├── use-entries.ts           # useEntries, useEntry, useCreateEntry, etc.
│   │   │   ├── use-entry-form.ts        # Lógica do form (separada do JSX)
│   │   │   └── use-payments.ts          # usePayEntry, useRefundPayment
│   │   └── types/
│   │       ├── entry.types.ts           # Entry, EntryStatus, EntryFilters (domain models)
│   │       └── entry.schemas.ts         # Zod schemas: createEntrySchema, payEntrySchema
│   │
│   ├── categories/
│   │   ├── components/
│   │   │   ├── category-tree.tsx
│   │   │   └── category-form.tsx
│   │   ├── hooks/
│   │   │   └── use-categories.ts
│   │   └── types/
│   │       └── category.types.ts
│   │
│   ├── contacts/
│   │   ├── hooks/
│   │   │   └── use-contacts.ts
│   │   └── types/
│   │       └── contact.types.ts
│   │
│   ├── reconciliation/
│   │   ├── components/
│   │   │   ├── upload-statement.tsx
│   │   │   ├── split-view.tsx
│   │   │   └── match-actions.tsx
│   │   ├── hooks/
│   │   │   └── use-reconciliation.ts    # Inclui useReducer para state complexo
│   │   └── types/
│   │       └── reconciliation.types.ts
│   │
│   ├── reports/
│   │   ├── components/
│   │   │   ├── dre-table.tsx
│   │   │   ├── balance-sheet-table.tsx
│   │   │   ├── aging-table.tsx
│   │   │   └── cashflow-detailed.tsx
│   │   └── hooks/
│   │       └── use-reports.ts
│   │
│   ├── transfers/
│   │   ├── components/
│   │   │   └── transfer-form.tsx
│   │   └── hooks/
│   │       └── use-transfers.ts
│   │
│   ├── approvals/
│   │   ├── components/
│   │   │   ├── approval-list.tsx
│   │   │   └── approval-actions.tsx
│   │   └── hooks/
│   │       └── use-approvals.ts
│   │
│   ├── boletos/
│   │   ├── components/
│   │   │   └── boleto-list.tsx
│   │   └── hooks/
│   │       └── use-boletos.ts
│   │
│   ├── collection-rules/
│   │   ├── components/
│   │   │   ├── rules-list.tsx
│   │   │   └── template-editor.tsx
│   │   └── hooks/
│   │       └── use-collection-rules.ts
│   │
│   ├── settings/
│   │   ├── components/
│   │   │   ├── bank-accounts-crud.tsx
│   │   │   ├── financial-settings.tsx
│   │   │   ├── lock-period-form.tsx
│   │   │   └── roles-manager.tsx
│   │   └── hooks/
│   │       ├── use-settings.ts
│   │       ├── use-bank-accounts.ts
│   │       ├── use-lock-periods.ts
│   │       └── use-roles.ts
│   │
│   └── audit/
│       ├── components/
│       │   └── audit-log-table.tsx
│       └── hooks/
│           └── use-audit-logs.ts
│
├── hooks/                               # APENAS hooks globais (não de feature)
│   ├── use-auth.ts                      # Dados do usuário logado (do AuthContext)
│   ├── use-branch.ts                    # Filial ativa (do BranchContext)
│   └── use-permissions.ts               # Check permissões do usuário
│
├── lib/                                 # Utilitários e configuração
│   ├── api-client.ts                    # Client HTTP para Client Components (fetch + credentials)
│   ├── api-server.ts                    # Client HTTP para Server Components (cookies() + headers())
│   ├── query-client.ts                  # Configuração do TanStack Query (singleton)
│   ├── query-keys.ts                    # Query keys centralizadas com branchId (NUNCA strings soltas)
│   ├── jwt.ts                           # Decode JWT com jose (server-side)
│   ├── format.ts                        # Formatadores: moeda, data, CPF, CNPJ, telefone
│   ├── validators.ts                    # Schemas zod COMPARTILHADOS (monetaryAmount, cpf, cnpj, etc.)
│   ├── constants.ts                     # Status labels/colors, routes, permission codes
│   ├── sentry.ts                        # Sentry config
│   └── api-types.ts                     # Types da API (ApiResponse, ApiError, PaginatedResponse)
│
│   # DOMAIN MODELS ficam dentro de cada feature (features/entries/types/, etc.)
│   # NÃO centralizar todos os types em lib/types.ts — isso acopla features entre si.
│   # lib/api-types.ts contém apenas estruturas genéricas da API (response wrappers, error).
│   # Cada feature define seus próprios types (Entry, Category, Contact, etc.)
│
├── providers/                           # React Context providers
│   ├── query-provider.tsx               # QueryClientProvider (singleton)
│   ├── theme-provider.tsx               # ThemeProvider (next-themes — claro/escuro/system)
│   ├── branch-provider.tsx              # BranchContext (filial ativa)
│   ├── auth-provider.tsx                # AuthContext (user decoded do JWT)
│   └── toast-provider.tsx               # Toast/Sonner provider
│
└── styles/
    └── globals.css                      # Tailwind imports + CSS variables do shadcn/ui
```

---

## 5. API CLIENT (client vs server)

### 5.1 Client HTTP — Client Components (`api-client.ts`)

Para uso em hooks (`useQuery`, `useMutation`) que rodam no client-side. Usa `credentials: 'include'` para enviar cookie JWT e `X-Branch-Id`.

```typescript
// lib/api-client.ts — APENAS para Client Components
import { ApiError, ApiResponse, PaginatedResponse } from './types';

class ApiClient {
  private baseUrl = '/api/v1';

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { idempotencyKey?: string },
  ): Promise<T> {
    const branchId = getBranchIdFromCookie();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(branchId && { 'X-Branch-Id': branchId }),
      ...(options?.idempotencyKey && { 'Idempotency-Key': options.idempotencyKey }),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
      credentials: 'include', // OK em Client Components
    });

    if (response.status === 204) return undefined as T;

    if (!response.ok) {
      const body = await response.json();
      throw new ApiError(
        body.error.code,
        body.error.message,
        body.error.details,
        response.status,
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const query = params ? '?' + new URLSearchParams(cleanParams(params)).toString() : '';
    return this.request(`${endpoint}${query}`);
  }

  async getList<T>(endpoint: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> {
    const query = params ? '?' + new URLSearchParams(cleanParams(params)).toString() : '';
    return this.request(`${endpoint}${query}`);
  }

  async post<T>(endpoint: string, body?: unknown, idempotencyKey?: string): Promise<ApiResponse<T>> {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      idempotencyKey,
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  async delete(endpoint: string): Promise<void> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
```

### 5.2 Server HTTP — Server Components (`api-server.ts`)

Para uso em Server Components e Server Actions. Usa `cookies()` e `headers()` do Next.js. **NUNCA usar `credentials: 'include'`** em Server Components — quebra o cache do Next.

```typescript
// lib/api-server.ts — APENAS para Server Components / Server Actions
import { cookies } from 'next/headers';
import { ApiResponse, PaginatedResponse, ApiError } from './types';

const BASE_URL = process.env.API_INTERNAL_URL || 'http://localhost:3001/api/v1';

export async function serverFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  const branchId = cookieStore.get('branch_id')?.value;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Cookie: `access_token=${token}` }),
      ...(branchId && { 'X-Branch-Id': branchId }),
      ...init?.headers,
    },
    // CRÍTICO: requests com Cookie são dinâmicos no Next.js.
    // revalidate NÃO funciona com cookies — Next trata como dynamic request.
    // Usar cache: 'no-store' para evitar cache inconsistente e SSR duplicado.
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? 'Erro na API',
      body?.error?.details,
      response.status,
    );
  }

  return response.json();
}

// REGRA: em pages que usam serverFetch, adicionar:
// export const dynamic = 'force-dynamic';
// Isso deixa explícito que a page é dinâmica (não SSG).

// Uso em Server Component:
// const summary = await serverFetch<ApiResponse<DashboardSummary>>('/dashboard/summary');
```

**Regra de quando usar qual**:
- `api-client.ts` → hooks (`useQuery`, `useMutation`), event handlers, Client Components
- `api-server.ts` → Server Components (`page.tsx` com `async`), Server Actions, dados iniciais

### 5.3 Query Keys centralizadas (NUNCA strings soltas)

**REGRA**: objetos como `filters` mudam de referência a cada render, o que pode causar refetches desnecessários. Serializar com `JSON.stringify` para garantir estabilidade.

**REGRA**: dados financeiros (por filial) incluem `branchId` na query key. Isso isola o cache por filial — ao trocar de filial, o cache antigo fica intacto e pode ser reutilizado se o usuário voltar.

```typescript
// lib/query-keys.ts
import { EntryFilters } from './types';

// Helper: serializa objetos para garantir estabilidade da query key
// JSON.stringify com sort garante mesma ordem de chaves.
// Evolução futura: trocar por superjson se filtros crescerem com tipos complexos (Date, Set, Map).
function stableKey(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

export const queryKeys = {
  // Dashboard (por filial)
  dashboard: {
    all: (branchId: string) => ['dashboard', branchId] as const,
    summary: (branchId: string) => ['dashboard', branchId, 'summary'] as const,
    cashflowChart: (branchId: string, period?: string) => ['dashboard', branchId, 'cashflow-chart', period] as const,
    expenseBreakdown: (branchId: string, period?: string) => ['dashboard', branchId, 'expense-breakdown', period] as const,
    overdue: (branchId: string) => ['dashboard', branchId, 'overdue'] as const,
  },

  // Entries — por filial
  entries: {
    all: (branchId: string) => ['entries', branchId] as const,
    list: (branchId: string, filters: EntryFilters) => ['entries', branchId, 'list', stableKey(filters)] as const,
    detail: (branchId: string, id: string) => ['entries', branchId, 'detail', id] as const,
    payments: (branchId: string, id: string) => ['entries', branchId, 'detail', id, 'payments'] as const,
  },

  // Categories — por filial
  categories: {
    all: (branchId: string) => ['categories', branchId] as const,
    tree: (branchId: string, type?: string) => ['categories', branchId, 'tree', type] as const,
  },

  // Contacts — nível tenant (NÃO por filial)
  contacts: {
    all: ['contacts'] as const,
    list: (filters?: Record<string, unknown>) => ['contacts', 'list', stableKey(filters ?? {})] as const,
  },

  // Bank accounts — por filial
  bankAccounts: {
    all: (branchId: string) => ['bank-accounts', branchId] as const,
  },

  // Approvals — por filial
  approvals: {
    pending: (branchId: string) => ['approvals', branchId, 'pending'] as const,
    history: (branchId: string) => ['approvals', branchId, 'history'] as const,
    count: (branchId: string) => ['approvals', branchId, 'count'] as const,
  },

  // Reports — por filial
  reports: {
    dre: (branchId: string, params: Record<string, unknown>) => ['reports', branchId, 'dre', stableKey(params)] as const,
    balanceSheet: (branchId: string, params: Record<string, unknown>) => ['reports', branchId, 'balance-sheet', stableKey(params)] as const,
    cashflow: (branchId: string, params: Record<string, unknown>) => ['reports', branchId, 'cashflow', stableKey(params)] as const,
    aging: (branchId: string, params: Record<string, unknown>) => ['reports', branchId, 'aging', stableKey(params)] as const,
  },

  // Transfers — por filial
  transfers: {
    all: (branchId: string) => ['transfers', branchId] as const,
    list: (branchId: string, filters?: Record<string, unknown>) => ['transfers', branchId, 'list', stableKey(filters ?? {})] as const,
  },

  // Boletos — por filial
  boletos: {
    all: (branchId: string) => ['boletos', branchId] as const,
    list: (branchId: string, filters?: Record<string, unknown>) => ['boletos', branchId, 'list', stableKey(filters ?? {})] as const,
  },

  // Reconciliation — por filial
  reconciliation: {
    batch: (branchId: string, batchId: string) => ['reconciliation', branchId, batchId] as const,
  },

  // Audit — por filial
  auditLogs: {
    list: (branchId: string, filters?: Record<string, unknown>) => ['audit-logs', branchId, 'list', stableKey(filters ?? {})] as const,
  },

  // Settings — por filial
  settings: (branchId: string) => ['settings', branchId] as const,
  lockPeriods: (branchId: string) => ['lock-periods', branchId] as const,
  collectionRules: (branchId: string) => ['collection-rules', branchId] as const,
  emailTemplates: (branchId: string) => ['email-templates', branchId] as const,
  approvalRules: (branchId: string) => ['approval-rules', branchId] as const,

  // Branches — nível tenant (NÃO por filial)
  branches: {
    all: ['branches'] as const,
    my: ['branches', 'my'] as const,
  },

  // RBAC — nível tenant (NÃO por filial)
  roles: ['roles'] as const,
  permissions: {
    me: ['permissions', 'me'] as const,
  },
} as const;
```

**Por que `branchId` na query key**: ao trocar de filial, o cache da filial anterior **não é apagado** — fica disponível se o usuário voltar. Não precisa de `queryClient.clear()`. Invalidação é feita com `queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(newBranchId) })` — afeta apenas a nova filial.

**Uso nos hooks**: todo hook de dados financeiros recebe `branchId` do `useBranch()`:
```typescript
const { activeBranch } = useBranch();
const { data } = useEntries(activeBranch.id, filters);
```

### 5.4 Types — API types vs Domain models

**API types** ficam em `lib/api-types.ts` — estruturas genéricas da comunicação com a API:

```typescript
// lib/api-types.ts — APENAS wrappers da API (genéricos, sem lógica de domínio)

// === Respostas da API ===
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// === Erro da API ===
export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public details?: Record<string, unknown>,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// === Entidades (Domain Models — ficam em features/{feature}/types/) ===
// Os types abaixo são definidos dentro de cada feature module, NÃO em lib/.
// Exemplo: Entry fica em features/entries/types/entry.types.ts
// Importação: import { Entry } from '@/features/entries/types/entry.types';

export interface Entry {
  id: string;
  documentNumber: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  amount: string;           // SEMPRE string
  issueDate: string;        // YYYY-MM-DD
  dueDate: string;
  paidDate: string | null;
  paidAmount: string | null;
  remainingBalance: string;
  status: EntryStatus;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  contactId: string | null;
  contactName: string | null;
  bankAccountId: string | null;
  paymentMethod: PaymentMethod | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  installmentLabel: string | null;  // "3/12"
  reconciled: boolean;
  notes: string | null;
  createdAt: string;
}

export type EntryStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type PaymentMethod = 'BOLETO' | 'PIX' | 'TRANSFER' | 'CARD' | 'CASH' | 'OTHER';

export interface Payment {
  id: string;
  entryId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: PaymentMethod | null;
  bankAccountId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'RECEITA' | 'DESPESA';
  parentId: string | null;
  color: string;
  active: boolean;
  sortOrder: number;
  children?: Category[];     // Árvore hierárquica
  entryCount?: number;       // Contador de lançamentos vinculados
}

export interface Contact {
  id: string;
  name: string;
  type: 'FORNECEDOR' | 'CLIENTE' | 'AMBOS';
  document: string | null;   // CPF/CNPJ formatado
  email: string | null;
  phone: string | null;      // (00) 00000-0000
  active: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  bankCode: string | null;
  agency: string | null;
  accountNumber: string | null;
  type: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CAIXA';
  initialBalance: string;
  currentBalance: string;   // Calculado pelo backend
  active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  document: string | null;   // CNPJ formatado
  isHeadquarters: boolean;
  active: boolean;
}

export interface DashboardSummary {
  currentBalance: string;
  totalReceivable30d: string;
  totalPayable30d: string;
  monthResult: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  fieldChanges: { field: string; oldValue: string; newValue: string }[] | null;
  createdAt: string;
}

// === Filtros de listagem ===
export interface EntryFilters {
  page?: number;
  pageSize?: number;
  type?: 'PAYABLE' | 'RECEIVABLE';
  status?: EntryStatus;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## 6. DATA LAYER — TANSTACK QUERY

### 6.1 Configuração

```typescript
// lib/query-client.ts — SINGLETON: criado UMA VEZ fora do componente
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30s antes de considerar stale
      gcTime: 5 * 60 * 1000,    // 5min no garbage collector
      retry: 1,                  // 1 retry automático
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,                  // Mutations não fazem retry automático
    },
  },
});
```

```typescript
// providers/query-provider.tsx — importa o singleton, NUNCA cria new QueryClient() aqui
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // ✅ CORRETO — usa singleton importado
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}

// ❌ PROIBIDO — criar QueryClient dentro do componente
// export function QueryProvider({ children }) {
//   const client = new QueryClient(); // ERRADO — cria nova instância a cada render
// }
```

### 6.2 Hydration — Server Components + TanStack Query SEM double fetch

**PROBLEMA**: se um Server Component chama `serverFetch` E o Client Component na mesma page usa `useQuery` para os mesmos dados, a API é chamada **2 vezes** (double fetch). Solução: usar **dehydrate + HydrationBoundary** do TanStack Query.

```typescript
// Fluxo correto:
// 1. Server Component faz fetch e popula queryClient (prefetch)
// 2. dehydrate() serializa o cache
// 3. HydrationBoundary repassa o cache para o client
// 4. useQuery no Client Component usa o cache — ZERO fetch adicional
// 5. Após staleTime, useQuery refaz o fetch normalmente (revalidação)

// app/dashboard/page.tsx — Server Component com prefetch
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { serverFetch } from '@/lib/api-server';
import { queryKeys } from '@/lib/query-keys';
import { DashboardClient } from '@/components/features/dashboard/dashboard-client';

export const dynamic = 'force-dynamic'; // Explícito: page é dinâmica

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // Prefetch no server — popula o cache
  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => serverFetch('/dashboard/summary'),
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.dashboard.overdue,
    queryFn: () => serverFetch('/dashboard/overdue'),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient /> {/* Client Component usa useQuery — pega do cache, sem double fetch */}
    </HydrationBoundary>
  );
}

// components/features/dashboard/dashboard-client.tsx — Client Component
'use client';

export function DashboardClient() {
  // Estes useQuery vão usar o cache do HydrationBoundary — ZERO fetch no mount
  const { data: summary } = useDashboardSummary();
  const { data: overdue } = useDashboardOverdue();

  // Após staleTime (30s), refaz o fetch automaticamente (revalidação normal)
  return (
    <>
      <SummaryCards data={summary} />
      <OverdueList data={overdue} />
    </>
  );
}
```

**Regras de Hydration**:
- Pages que fazem prefetch: criar `new QueryClient()` local (não usar o singleton global — seria compartilhado entre requests)
- Wrapping: `<HydrationBoundary state={dehydrate(queryClient)}>` ao redor do Client Component
- Client Component usa `useQuery` normal — pega do cache hidratado
- **NÃO usar Hydration em TODAS as pages** — apenas nas que precisam de dados no primeiro render (dashboard, detalhe). Listagens com filtros podem fazer fetch só no client (mais simples)
- Toda page com `serverFetch` deve ter `export const dynamic = 'force-dynamic'`

### 6.3 Padrão de hooks — Query (leitura)

```typescript
// hooks/use-entries.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Entry, EntryFilters, PaginatedResponse } from '@/lib/types';

// === QUERIES ===

export function useEntries(filters: EntryFilters) {
  return useQuery({
    queryKey: queryKeys.entries.list(filters),  // ← centralized, never loose strings
    queryFn: ({ signal }) =>
      api.getList<Entry>('/entries', { ...filters, signal }),
    placeholderData: keepPreviousData, // Mantém dados anteriores enquanto carrega nova página
  });
}

export function useEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.entries.detail(id),
    queryFn: () => api.get<Entry>(`/entries/${id}`),
    enabled: !!id,
  });
}

export function useEntryPayments(entryId: string) {
  return useQuery({
    queryKey: queryKeys.entries.payments(entryId),
    queryFn: () => api.getList<Payment>(`/entries/${entryId}/payments`),
    enabled: !!entryId,
  });
}
```

### 6.4 Padrão de hooks — Mutation (escrita)

```typescript
// hooks/use-entries.ts (continuação)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuid } from 'uuid';
import { toast } from 'sonner';

// === MUTATIONS ===

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEntryInput) =>
      api.post<Entry>('/entries', dto, uuid()), // Idempotency key
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Lançamento criado com sucesso');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function usePayEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...dto }: PayEntryInput & { entryId: string }) =>
      api.post<Payment>(`/entries/${entryId}/pay`, dto, uuid()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(branchId, variables.entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Pagamento registrado');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useCancelEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/entries/${entryId}/cancel`, { reason }, uuid()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Lançamento cancelado');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      api.post(`/entries/${entryId}/refund`, { reason }, uuid()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
      toast.success('Pagamento estornado');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
```

### 6.5 Regras do data layer

- **TODA chamada à API usa hook com TanStack Query** — nenhum `fetch` direto em componentes
- **Query keys incluem `branchId`** para dados financeiros: `queryKeys.entries.all(branchId)`. Dados de tenant (contacts, roles) NÃO incluem branchId
- **Hydration para pages com dados iniciais** — Server Component faz prefetch + `dehydrate`, Client Component usa `useQuery` sem double fetch (seção 6.2)
- **Sorting e paginação são 100% server-driven** — params enviados para API (`?sortBy=&sortOrder=&page=`). ZERO sorting ou filtering no client
- **Mutations invalidam caches afetados** — `queryKeys.entries.all(branchId)` + `queryKeys.dashboard.all(branchId)`
- **Idempotency key (uuid)** em toda mutation que gera side effect: create, pay, cancel, refund, transfer
- **Toast agrupado para ações em lote** — se 5 pagamentos em lote, mostra 1 toast ("5 pagamentos registrados"), não 5 toasts individuais. Implementar via `toast.success(\`${count} pagamentos registrados\`)` no onSuccess do batch mutation
- **`onError` sempre mostra toast** com `error.message` (mensagem já vem traduzida do backend)
- **`placeholderData: keepPreviousData`** em listagens paginadas — evita flash de loading ao mudar página
- **`enabled: !!id`** em queries de detalhe — não dispara se ID é undefined

---

## 7. FORMULÁRIOS — REACT-HOOK-FORM + ZOD

### 7.1 Schema de validação (zod)

```typescript
// lib/validators.ts
import { z } from 'zod';
import Decimal from 'decimal.js';

// === Validadores reutilizáveis ===
export const monetaryAmount = z
  .string()
  .max(15, 'Valor muito longo')   // Limita tamanho ANTES de criar Decimal (previne DoS)
  .regex(/^\d+\.\d{2}$/, 'Formato inválido (ex: 1500.00)')
  .refine((v) => new Decimal(v).greaterThan(0), 'Valor deve ser positivo')
  .refine((v) => new Decimal(v).lessThanOrEqualTo('999999999.99'), 'Valor máximo excedido');

export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (000.000.000-00)');

export const cnpjSchema = z
  .string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido');

export const documentSchema = z.string().refine(
  (v) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(v),
  'CPF ou CNPJ inválido',
);

export const phoneSchema = z
  .string()
  .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido');

export const cepSchema = z
  .string()
  .regex(/^\d{5}-\d{3}$/, 'CEP inválido');

// === Schema do formulário de lançamento ===
export const createEntrySchema = z.object({
  description: z.string().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  type: z.enum(['PAYABLE', 'RECEIVABLE']),
  amount: monetaryAmount,
  issueDate: z.string().min(1, 'Data obrigatória'),
  dueDate: z.string().min(1, 'Data obrigatória'),
  categoryId: z.string().uuid('Categoria obrigatória'),
  contactId: z.string().uuid().optional().or(z.literal('')),
  bankAccountId: z.string().uuid().optional().or(z.literal('')),
  paymentMethod: z.enum(['BOLETO', 'PIX', 'TRANSFER', 'CARD', 'CASH', 'OTHER']).optional(),
  installment: z.boolean().default(false),
  installmentCount: z.number().int().min(2).max(120).optional(),
  installmentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.dueDate >= data.issueDate,
  { message: 'Vencimento deve ser >= emissão', path: ['dueDate'] },
).refine(
  (data) => !data.installment || (data.installmentCount && data.installmentFrequency),
  { message: 'Parcelas e frequência obrigatórios', path: ['installmentCount'] },
);

export type CreateEntryInput = z.infer<typeof createEntrySchema>;

// === Schema do pagamento ===
export const payEntrySchema = z.object({
  amount: monetaryAmount,
  paymentDate: z.string().min(1, 'Data obrigatória'),
  paymentMethod: z.enum(['BOLETO', 'PIX', 'TRANSFER', 'CARD', 'CASH', 'OTHER']).optional(),
  bankAccountId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});
```

### 7.2 Padrão de uso nos formulários

```typescript
// components/features/entries/entry-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEntrySchema, CreateEntryInput } from '@/lib/validators';
import { useCreateEntry } from '@/hooks/use-entries';
import { CurrencyInput } from '@/components/shared/currency-input';
import { DatePicker } from '@/components/shared/date-picker';

export function EntryForm({ type }: { type: 'PAYABLE' | 'RECEIVABLE' }) {
  const form = useForm<CreateEntryInput>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: {
      type,
      issueDate: new Date().toISOString().split('T')[0], // Hoje
      installment: false,
    },
  });

  const createEntry = useCreateEntry();

  const onSubmit = form.handleSubmit((data) => {
    createEntry.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Campos do formulário usando componentes shared */}
      {/* CurrencyInput para valor */}
      {/* DatePicker para datas */}
      {/* Select para categoria (filtrado por tipo) */}
      {/* Command/Autocomplete para contato */}
      {/* Toggle para parcelamento */}

      <Button type="submit" disabled={createEntry.isPending}>
        {createEntry.isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
```

### 7.3 Regras de formulários

- **Toda validação client-side com zod** — nunca validar manualmente
- **Valores monetários**: `CurrencyInput` trabalha com centavos internamente → converte para `"1500.00"` ao submeter
- **Datas**: `DatePicker` exibe `DD/MM/YYYY`, envia `YYYY-MM-DD`
- **CPF/CNPJ/telefone/CEP**: componentes masked que armazenam o valor formatado
- **Mensagens de erro em português** — definidas no schema zod
- **Botão de submit desabilitado** enquanto mutation `isPending`
- **Toast automático** via hook mutation (`onSuccess`/`onError`)

---

## 8. SISTEMA DE FILIAIS (BRANCH SWITCHER)

### 8.1 Branch Context

```typescript
// providers/branch-provider.tsx
'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Branch } from '@/lib/types';

interface BranchContextValue {
  activeBranch: Branch | null;
  activeBranchId: string;
  branches: Branch[];
  switchBranch: (branchId: string) => void;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue>(null!);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [activeBranchId, setActiveBranchId] = useState<string>(() =>
    getCookie('branch_id') || '',
  );

  // Busca filiais acessíveis pelo usuário
  const { data: branchesData, isLoading } = useQuery({
    queryKey: queryKeys.branches.my,
    queryFn: () => api.get<Branch[]>('/branches/my'),
  });

  const branchesList = branchesData?.data ?? [];

  // useCallback estabiliza a função — evita re-render de filhos
  const switchBranch = useCallback((branchId: string) => {
    setCookie('branch_id', branchId);
    setActiveBranchId(branchId);
    // NÃO usar queryClient.clear() — branchId na query key isola o cache por filial.
  }, []);

  const activeBranch = useMemo(
    () => branchesList.find((b) => b.id === activeBranchId) ?? null,
    [branchesList, activeBranchId],
  );

  // Se não tem filial ativa, seleciona a primeira
  useEffect(() => {
    if (!activeBranchId && branchesList.length > 0) {
      switchBranch(branchesList[0].id);
    }
  }, [branchesList, activeBranchId, switchBranch]);

  // useMemo estabiliza o objeto do context — evita render storm (re-render de 200+ componentes)
  const contextValue = useMemo<BranchContextValue>(
    () => ({ activeBranch, activeBranchId, branches: branchesList, switchBranch, isLoading }),
    [activeBranch, activeBranchId, branchesList, switchBranch, isLoading],
  );

  return (
    <BranchContext.Provider value={contextValue}>
      {children}
    </BranchContext.Provider>
  );
}

export const useBranch = () => useContext(BranchContext);
```

### 8.2 Branch Switcher (componente UI)

```typescript
// components/layout/branch-switcher.tsx
'use client';

import { useBranch } from '@/providers/branch-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export function BranchSwitcher() {
  const { activeBranch, branches, switchBranch } = useBranch();

  if (branches.length <= 1) return null; // Não mostra se só tem 1 filial

  return (
    <Select value={activeBranch?.id} onValueChange={switchBranch}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="mr-2 h-4 w-4" />
        <SelectValue placeholder="Selecione a filial" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
            {branch.isHeadquarters && ' (Matriz)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Regra**: ao trocar de filial, NÃO apagar o cache (`clear()`). O `branchId` na query key isola o cache por filial automaticamente. O cache da filial anterior fica disponível se o usuário voltar (sem refetch). TanStack Query faz fetch da nova filial via mudança na query key.

---

## 9. PERMISSÕES NO FRONTEND (RBAC)

### 9.1 Hook de permissões

```typescript
// hooks/use-permissions.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface UserPermissions {
  permissions: string[];
  isAdmin: boolean;
}

export function usePermissions() {
  const { data } = useQuery({
    queryKey: queryKeys.permissions.me,
    queryFn: () => api.get<UserPermissions>('/users/me/permissions'),
    staleTime: 5 * 60 * 1000, // 5min — mesmo TTL do cache Redis no backend
  });

  const hasPermission = (code: string): boolean => {
    if (data?.data.isAdmin) return true;
    return data?.data.permissions.includes(code) ?? false;
  };

  const hasAnyPermission = (codes: string[]): boolean => {
    return codes.some(hasPermission);
  };

  return { hasPermission, hasAnyPermission, isAdmin: data?.data.isAdmin ?? false };
}
```

### 9.2 Componente PermissionGate

```typescript
// components/shared/permission-gate.tsx
'use client';

import { usePermissions } from '@/hooks/use-permissions';

interface Props {
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: Props) {
  const { hasPermission, hasAnyPermission } = usePermissions();

  const allowed = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  return allowed ? <>{children}</> : <>{fallback}</>;
}

// Uso:
<PermissionGate permission="financial.entries.create">
  <Button>Nova conta a pagar</Button>
</PermissionGate>

<PermissionGate permission="financial.entries.pay">
  <Button onClick={openPayModal}>Registrar pagamento</Button>
</PermissionGate>

// Menu lateral com badge de aprovações:
<PermissionGate permission="financial.entries.approve">
  <SidebarItem href="/financeiro/aprovacoes" badge={pendingCount}>
    Aprovações
  </SidebarItem>
</PermissionGate>
```

### 9.3 Permissões no menu lateral

O menu lateral **só exibe itens que o usuário tem permissão para acessar**:

| Item do menu | Permissão necessária |
|---|---|
| Dashboard | `financial.dashboard.view` |
| Contas a pagar | `financial.entries.view` |
| Contas a receber | `financial.entries.view` |
| Fluxo de caixa | `financial.reports.view` |
| Categorias | `financial.categories.view` |
| Conciliação | `financial.reconciliation.execute` |
| Relatórios | `financial.reports.view` |
| Transferências | `financial.entries.create` |
| Boletos | `financial.entries.view` |
| Aprovações | `financial.entries.approve` (+ badge com contagem) |
| Auditoria | `financial.audit.view` |
| Configurações | `financial.settings.manage` |
| Régua de cobrança | `financial.settings.manage` |
| Admin > Filiais | `admin.branches.manage` |
| Admin > Usuários | `admin.users.manage` |

---

## 10. FORMATAÇÃO E EXIBIÇÃO

### 10.1 Formatadores centralizados

```typescript
// lib/format.ts
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Decimal from 'decimal.js';

// === Moeda ===
export function formatCurrency(value: string): string {
  // "1500.00" → "R$ 1.500,00"
  // Usa Intl.NumberFormat com string convertida de forma segura.
  // Para valores muito grandes (999999999999999.99) onde toNumber() perde precisão,
  // o Decimal garante a string correta antes da conversão.
  const num = new Decimal(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num.toNumber());
  // NOTA: Intl.NumberFormat exige number. Para valores > Number.MAX_SAFE_INTEGER (improvável em BRL),
  // usar formatação manual: num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// === Data ===
export function formatDate(isoDate: string): string {
  // "2026-03-15" → "15/03/2026"
  return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(isoDate: string): string {
  // "2026-03-15T14:30:00Z" → "15/03/2026 14:30"
  return format(parseISO(isoDate), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

// === Documentos ===
// CPF e CNPJ já vêm formatados do backend — apenas exibir
// Se precisar formatar input (antes de enviar): os componentes masked fazem isso

// === Status ===
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguard. Aprovação',
  PENDING: 'Pendente',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  PENDING: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-purple-100 text-purple-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500 line-through',
};
```

### 10.2 Componente CurrencyInput (máscara monetária)

```typescript
// components/shared/currency-input.tsx
'use client';

import { NumericFormat } from 'react-number-format';
import { forwardRef } from 'react';

interface Props {
  value: string;                    // "1500.00"
  onChange: (value: string) => void; // Retorna "1500.00"
  disabled?: boolean;
  placeholder?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, ...props }, ref) => {
    return (
      <NumericFormat
        getInputRef={ref}
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ "
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        value={value ? new Decimal(value).toNumber() : ''} // Decimal.toNumber() preserva precisão em valores grandes
        onValueChange={(values) => {
          // Guard: floatValue é undefined quando campo apagado, e 0 é valor válido
          if (values.floatValue === undefined || values.floatValue === null) {
            onChange('');
            return;
          }
          onChange(values.floatValue.toFixed(2));
        }}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        {...props}
      />
    );
  }
);
```

### 10.3 Componente MoneyDisplay

```typescript
// components/shared/money-display.tsx
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
  value: string;          // "1500.00"
  colored?: boolean;      // Verde se positivo, vermelho se negativo
  className?: string;
}

export function MoneyDisplay({ value, colored = false, className }: Props) {
  const isNegative = value.startsWith('-');
  return (
    <span className={cn(
      'font-mono tabular-nums',
      colored && (isNegative ? 'text-red-600' : 'text-green-600'),
      className,
    )}>
      {formatCurrency(value)}
    </span>
  );
}
```

---

## 11. COMPONENTES DE UI OBRIGATÓRIOS

### 11.1 Estados visuais — TODA página que faz fetch

```typescript
// Padrão obrigatório em TODA listagem:
const { data, isLoading, isError, error, refetch } = useEntries(filters);

if (isLoading) return <TableSkeleton rows={10} cols={7} />;   // Skeleton, NUNCA spinner
if (isError) return <ErrorBanner message={error.message} onRetry={refetch} />;
if (!data?.data.length) return <EmptyState
  icon={FileText}
  title="Nenhum lançamento encontrado"
  description="Crie seu primeiro lançamento para começar"
  action={
    <PermissionGate permission="financial.entries.create">
      <Button asChild><Link href="/financeiro/contas-pagar/nova">Nova conta a pagar</Link></Button>
    </PermissionGate>
  }
/>;

return <EntriesTable entries={data.data} meta={data.meta} />;
```

### 11.2 DataTable genérica paginada

Construída sobre **@tanstack/react-table** (headless) + shadcn/ui `Table` (visual). É o componente mais crítico da UI — usado em 10+ telas.

```typescript
// components/shared/data-table.tsx
// Baseada em @tanstack/react-table (headless) + shadcn/ui Table (visual)
//
// CRÍTICO: DataTable é 100% SERVER-DRIVEN. Sorting, pagination, filtros:
// tudo enviado para API como query params. ZERO sorting ou filtering client-side.
// Motivo: com 200k+ lançamentos, sorting local trava o browser.
//
// Props:
//   columns: ColumnDef<T>[]         — definição de colunas (@tanstack/react-table)
//   data: T[]                        — dados da página atual (JÁ PAGINADO pelo backend)
//   meta: PaginationMeta             — { page, pageSize, total, totalPages }
//   onPageChange: (page) => void     — muda ?page= na URL → refetch
//   onSortChange: (sortBy, order) => void  — muda ?sortBy=&sortOrder= → refetch
//   enableSelection?: boolean        — checkbox para ações em lote
//   onSelectionChange?: (ids) => void
//   enableVirtualization?: boolean   — ativar se meta.total > 300
//
// Features embutidas:
//   - Sorting por coluna (header clicável)
//   - Paginação inferior: "Mostrando 1-20 de 347" + prev/next + page selector
//   - Checkbox de seleção em lote (header seleciona todos da página)
//   - Virtualização com @tanstack/react-virtual (quando enableVirtualization=true)
//   - Loading state: rows com skeleton quando isLoading=true
//   - Rows alternados: branco / slate-50
//   - Hover: blue-50
//
// NUNCA construir tabela manualmente com <table> direto — sempre usar DataTable
```

### 11.3 StatusBadge

```typescript
// components/shared/status-badge.tsx
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/format';

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={STATUS_COLORS[status]}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
```

### 11.4 ConfirmDialog (cancelar, excluir, estornar)

```typescript
// Para ações destrutivas — SEMPRE pedir confirmação
// Cancelar/rejeitar: motivo obrigatório (textarea, min 10 caracteres)
// Excluir: confirmação simples
// Estornar: mostra prazo restante + motivo obrigatório
```

---

## 12. TELAS DETALHADAS

### 12.1 Dashboard (`/dashboard`)

**Permissão**: `financial.dashboard.view`

**Layout**: grid 2x2 de cards no topo + gráfico grande + lista de vencidas

**Componentes**:
- `SummaryCards` — 4 cards: Saldo atual (azul), A receber 30d (verde), A pagar 30d (vermelho), Resultado do mês (verde/vermelho). Clicar navega para listagem correspondente. Hook: `useDashboardSummary()`
- `CashflowChart` — Gráfico de linhas (recharts `LineChart`). Duas linhas: entradas (verde) e saídas (vermelho). Eixo X: últimos 12 meses. Tooltip com valor formatado. Hook: `useDashboardCashflowChart()`
- `ExpenseDonut` — Donut chart (recharts `PieChart`) de despesas por categoria no mês. Legenda com cor da categoria + valor + percentual. Hook: `useDashboardExpenseBreakdown()`
- `OverdueList` — Tabela resumida: documento, descrição, fornecedor/cliente, vencimento, valor, dias em atraso. Máximo 10 itens + link "Ver todas". Hook: `useDashboardOverdue()`
- Filtro de período: seletor mês/ano no `PageHeader`

### 12.2 Contas a Pagar — Listagem (`/financeiro/contas-pagar`)

**Permissão**: `financial.entries.view`

**Layout**: PageHeader + filtros + tabela paginada + barra de ações em lote

**Filtros** (`EntryFilters` + `nuqs` para sincronizar com URL):
- Status: dropdown multi-select (Todos, Rascunho, Aguard. Aprovação, Pendente, Parcial, Pago, Vencido, Cancelado)
- Período: date range picker (início + fim do vencimento)
- Categoria: dropdown com categorias tipo DESPESA ativas
- Busca: input de texto (busca em descrição, fornecedor, document_number)

**Colunas da tabela**:
| Coluna | Componente | Observação |
|---|---|---|
| ☐ | Checkbox | Seleção para ações em lote |
| Código | Texto mono | `document_number` (ex: PAY-2026-00045) |
| Descrição | Texto | Truncar com ellipsis se > 40 chars |
| Fornecedor | Texto | `contactName` (ou "—" se null) |
| Categoria | `CategoryBadge` | Cor + nome |
| Vencimento | Texto | `formatDate()`. Vermelho se vencida |
| Valor | `MoneyDisplay` | `amount` formatado |
| Status | `StatusBadge` | Badge colorido |
| Ações | `DropdownMenu` | Ver, Editar, Pagar, Cancelar, Excluir (filtrado por permissão) |

**Ações**:
- Botão "Nova conta a pagar" (permissão: `entries.create`) → navega para `/nova`
- Ações em lote: ao selecionar ≥1 item, aparece barra fixa inferior com "Pagar selecionados" (permissão: `entries.pay`)
- Exportar CSV/PDF (permissão: `reports.export`)
- Paginação: `?page=1&pageSize=20` sincronizado via `nuqs`

### 12.3 Contas a Pagar — Formulário (`/financeiro/contas-pagar/nova` e `/[id]`)

**Permissão**: `entries.create` (nova) ou `entries.edit` (edição — somente status PENDING)

**Form** (`react-hook-form` + `zodResolver`):
- Descrição: `Input` (3-200 chars)
- Fornecedor: `Command` autocomplete (busca em `/contacts?type=FORNECEDOR`)
- Categoria: `Select` (apenas categorias tipo DESPESA ativas da filial)
- Valor: `CurrencyInput` (> 0)
- Data emissão: `DatePicker` (default hoje, não pode ser futura)
- Data vencimento: `DatePicker` (>= emissão)
- Conta bancária: `Select` (contas ativas da filial — opcional)
- Forma de pagamento: `Select` (BOLETO, PIX, TRANSFER, CARD, CASH, OTHER — opcional)
- Parcelamento: `Switch` toggle → revela:
  - Num. parcelas: `Input number` (2-120)
  - Frequência: `Select` (Mensal, Quinzenal, Semanal, Anual)
  - `InstallmentPreview`: tabela preview com parcelas calculadas (parcela, vencimento, valor). Usa `decimal.js` para calcular
- Observações: `Textarea` (max 500)
- Anexo: `FileUpload` (PDF, JPG, PNG, max 10MB — upload direto para R2 via presigned URL)

**Botões**:
- "Salvar como rascunho" → status `DRAFT`
- "Salvar e enviar" → status `PENDING` ou `PENDING_APPROVAL` (backend decide)
- "Cancelar" → volta para listagem (confirmação se form dirty)

### 12.4 Contas a Receber (`/financeiro/contas-receber`)

**Idêntico** à Contas a Pagar com ajustes:
- "Fornecedor" → "Cliente" (contacts tipo `CLIENTE`/`AMBOS`)
- Categorias filtram tipo `RECEITA`
- Status "PAGO" exibido como "RECEBIDO" na UI
- Campo adicional: "Forma de recebimento"

### 12.5 Detalhe do Lançamento (`/financeiro/contas-pagar/[id]`)

**Layout**: header com document_number + status badge + ações + body com dados + sidebar com pagamentos

**Informações exibidas**: todos os campos do lançamento formatados, contato (link), categoria (badge), parcela (3/12), observações, anexo (link para download)

**Ações** (condicionais por status e permissão):
| Ação | Status permitidos | Permissão | UI |
|---|---|---|---|
| Editar | PENDING | `entries.edit` | Botão no header |
| Pagar | PENDING, PARTIAL, OVERDUE | `entries.pay` | `PaymentModal` |
| Cancelar | PENDING, OVERDUE | `entries.cancel` | `CancelModal` (motivo obrigatório) |
| Estornar | PAID, PARTIAL | `entries.cancel` | `RefundModal` (motivo + prazo) |
| Excluir | PENDING, CANCELLED | `entries.delete` | `ConfirmDialog` |

**Histórico de pagamentos**: tabela com pagamentos parciais (data, valor, forma, observação). Hook: `useEntryPayments(id)`

### 12.6 Fluxo de Caixa (`/financeiro/fluxo-caixa`)

**Permissão**: `financial.reports.view`

- Seletor de granularidade: `Tabs` — Diário / Semanal / Mensal
- Gráfico: `BarChart` empilhadas (recharts) — entradas (verde), saídas (vermelho), linha de saldo acumulado
- Toggle projeção: `Switch` — inclui entries PENDING com due_date futura (barras com opacidade 50%)
- Alerta: banner vermelho se saldo projetado negativo
- Tabela abaixo: Data, Entradas, Saídas, Saldo período, Saldo acumulado
- Filtros: categoria, fornecedor/cliente
- Exportar PDF/CSV (permissão: `reports.export`)

### 12.7 Categorias (`/financeiro/categorias`)

**Permissão**: `financial.categories.manage`

- Árvore hierárquica expansível (max 3 níveis) — usar componente tree custom ou nested lists
- Badge `RECEITA` (verde) / `DESPESA` (vermelho) em cada item
- Contador de lançamentos vinculados
- Drag-and-drop para reordenar (`sort_order`)
- Botão "Nova categoria" abre dialog com: nome, tipo, pai (select), cor (color picker)
- Categorias com lançamentos: botão "Excluir" desabilitado, mostra "Desativar" em vez disso
- Desativar pai desativa subcategorias (confirmação)

### 12.8 Conciliação Bancária (`/financeiro/conciliacao`)

**Permissão**: `financial.reconciliation.execute`

**Fluxo em etapas**:
1. Seleciona conta bancária (dropdown)
2. Upload de extrato (OFX ou CSV) → `FileUpload`
3. Sistema parseia no backend → retorna itens
4. **Tela split**: lado esquerdo = extrato (bank_statements), lado direito = lançamentos do ERP
5. Matches sugeridos: conectados por linha tracejada
6. Ações por item: Confirmar match (✓), Rejeitar (✗), Criar novo lançamento (+)
7. Itens confirmados ficam verdes em ambos os lados

### 12.9 Relatórios (`/financeiro/relatorios`)

**Permissão**: `financial.reports.view`

Page principal com cards para navegar: DRE, Balancete, Aging

**DRE** (`/financeiro/relatorios/dre`):
- Filtro: período (mês, trimestre, ano), toggle comparativo período anterior
- Tabela:
  - (+) Receitas brutas (por categoria RECEITA)
  - (-) Deduções
  - (=) Receita líquida
  - (-) Despesas operacionais (por categoria DESPESA)
  - (=) Resultado operacional
  - (=) Resultado líquido
- Se comparativo: duas colunas lado a lado + coluna de variação percentual
- Exportar PDF/CSV

**Balancete** (`/financeiro/relatorios/balancete`):
- Tabela: Categoria, Saldo anterior, Entradas, Saídas, Saldo final
- Agrupado por tipo (Receitas/Despesas) com subtotais
- Filtro: período + nível de detalhe (pais ou todas)

**Aging** (`/financeiro/relatorios/aging`):
- Tabela agrupada por faixas: 1-15d, 16-30d, 31-60d, 60+
- Totais por faixa + total geral
- Colunas: Fornecedor/Cliente, Documento, Valor, Vencimento, Dias em atraso

### 12.10 Transferências (`/financeiro/transferencias`)

**Permissão**: `financial.entries.create`

- Formulário: conta origem (select + saldo), conta destino (select, exclui origem), valor (`CurrencyInput`), data (`DatePicker`), descrição
- Após salvar: confirmação visual "R$ 5.000,00 transferidos de Conta Itaú para Poupança BB"
- Listagem histórica com filtros: período, conta
- **Não aparece no DRE** — reforçar visualmente com info tooltip

### 12.11 Aprovações (`/financeiro/aprovacoes`)

**Permissão**: `financial.entries.approve`

- Lista de lançamentos `PENDING_APPROVAL` filtrados pela role do usuário
- Colunas: código, descrição, fornecedor/cliente, valor, vencimento, criado por, data criação
- Badge de valor: vermelho se > R$ 10.000
- Badge com contagem no menu lateral (sidebar)
- Ações: Aprovar (confirma), Rejeitar (modal com motivo obrigatório min 10 chars), Ver detalhe
- Aprovar em lote: selecionar + botão "Aprovar selecionados"

### 12.12 Boletos (`/financeiro/boletos`)

**Permissão**: `financial.entries.view`

- Lista com status: PENDENTE (amarelo), PAGO (verde), CANCELADO (cinza), VENCIDO (vermelho)
- Filtros: período, status, cliente
- Ações: Visualizar PDF (abre em nova aba), Reenviar por e-mail, Cancelar

### 12.13 Auditoria (`/financeiro/auditoria`)

**Permissão**: `financial.audit.view`

- **Somente leitura** — nenhuma ação de edição/exclusão
- Tabela: data/hora, usuário (email), ação (badge), entidade, registro afetado
- Filtros: usuário, ação, entidade, período
- Expandir linha: mostra `field_changes` (campo, valor anterior, valor novo) em tabela aninhada
- Exportar CSV

### 12.14 Configurações (`/financeiro/configuracoes`)

**Permissão**: `financial.settings.manage`

Layout com `Tabs`:
- **Contas bancárias**: DataTable + CRUD em dialog (banco, agência, conta, tipo, saldo inicial)
- **Geral**: dia de fechamento (1-28), prazo de estorno (pagar/receber), alertas
- **Bloqueio contábil**: definir data de fechamento + listar períodos bloqueados. Admin pode remover
- **Regras de aprovação**: CRUD de regras (tipo, valor mínimo, role aprovadora)
- **Roles e permissões**: CRUD de roles, atribuir permissões via checkbox matrix, vincular usuários

### 12.15 Régua de Cobrança (`/financeiro/regua-cobranca`)

**Permissão**: `financial.settings.manage`

- Lista de regras: evento, dias, template vinculado, ativo/inativo
- CRUD de regras em dialog
- Preview de e-mail: botão "Visualizar" renderiza template com dados fictícios
- Editor de templates: subject + body HTML com variáveis disponíveis (`{{nome_cliente}}`, `{{valor}}`, etc.)

---

## 13. UPLOAD DE ARQUIVOS (Presigned URL)

```typescript
// Fluxo de upload de anexo:
// 1. Frontend pede presigned URL ao backend: POST /attachments/presign { filename, mimeType }
// 2. Backend retorna: { uploadUrl, storageKey }
// 3. Frontend faz PUT direto para o uploadUrl (R2) com o arquivo
// 4. Frontend envia storageKey junto com o lançamento na criação/edição

// components/shared/file-upload.tsx
// - Drag and drop zone (react-dropzone ou nativo)
// - Validação client-side: PDF, JPG, PNG, max 10MB
// - Progress bar via XMLHttpRequest (fetch não expõe progresso de upload)
// - Retry automático (até 3 tentativas com backoff) se upload falhar
// - Preview do arquivo após upload
// - Botão de remover
//
// IMPORTANTE: fetch() não expõe upload progress. Para arquivos grandes (até 10MB),
// usar XMLHttpRequest com onprogress para mostrar barra de progresso:
//
// const xhr = new XMLHttpRequest();
// xhr.upload.onprogress = (e) => setProgress(Math.round((e.loaded / e.total) * 100));
// xhr.open('PUT', presignedUrl);
// xhr.setRequestHeader('Content-Type', file.type);
// xhr.send(file);
//
// Retry: se xhr.status !== 200, tentar novamente com backoff (1s, 2s, 4s).
// Após 3 falhas, mostrar erro e botão "Tentar novamente".
```

---

## 14. DESIGN SYSTEM E CORES

### 14.1 Marca e identidade

- **Nome no sistema**: "Nexos Financeiro" (não "Nexos ERP" — o ERP é a plataforma, o módulo é "Financeiro")
- **Sidebar brand**: Logo (ícone "N" em quadrado azul arredondado) + "Nexos Financeiro" ao lado. Quando sidebar colapsada, mostra apenas o ícone do logo
- **Tipografia**: `Inter` como font-family principal (sistema como fallback). Nunca serif em ERP

### 14.2 Tema claro e escuro (obrigatório — cliente escolhe)

O sistema suporta **tema claro e escuro** desde o início. O toggle fica no header. Preferência salva em `localStorage` + cookie (para que o server-side rendering respeite a escolha).

```typescript
// components/layout/theme-toggle.tsx
// - Botão no header com ícone sol/lua
// - Salva em localStorage('theme') + cookie('theme')
// - Aplica class 'dark' no <html> via next-themes
// - Default: 'system' (segue preferência do SO)

// Usar next-themes para gerenciar:
// providers/theme-provider.tsx
import { ThemeProvider } from 'next-themes';
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### 14.3 Paleta de cores (CSS Variables — shadcn/ui)

Tema **profissional e limpo**, azul como cor primária (confiança, finance) e acentos semânticos para status.

```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* === BACKGROUND === */
    --background: 0 0% 100%;           /* #FFFFFF — fundo principal */
    --foreground: 222 47% 11%;          /* #0F172A — texto principal (slate-900) */

    /* === CARDS E SURFACES === */
    --card: 0 0% 100%;                  /* #FFFFFF */
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* === PRIMÁRIA (Azul — ações principais, links, sidebar ativa) === */
    --primary: 221 83% 53%;             /* #3B82F6 — blue-500 */
    --primary-foreground: 210 40% 98%;  /* texto branco sobre primary */

    /* === SECUNDÁRIA (Cinza — botões secundários, backgrounds sutis) === */
    --secondary: 210 40% 96%;           /* #F1F5F9 — slate-100 */
    --secondary-foreground: 222 47% 11%;

    /* === MUTED (Textos secundários, placeholders) === */
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;    /* #64748B — slate-500 */

    /* === ACCENT (Hover, backgrounds interativos) === */
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;

    /* === DESTRUCTIVE (Exclusão, cancelamento, erros) === */
    --destructive: 0 84% 60%;           /* #EF4444 — red-500 */
    --destructive-foreground: 0 0% 100%;

    /* === BORDERS E INPUTS === */
    --border: 214 32% 91%;              /* #E2E8F0 — slate-200 */
    --input: 214 32% 91%;
    --ring: 221 83% 53%;                /* Focus ring = primary */

    /* === SIDEBAR === */
    --sidebar-bg: 222 47% 11%;          /* #0F172A — slate-900 (dark sidebar) */
    --sidebar-foreground: 210 40% 96%;
    --sidebar-active: 221 83% 53%;      /* Primary blue */
    --sidebar-hover: 217 33% 17%;       /* slate-800 */

    /* === CONTENT AREA === */
    --content-bg: 210 40% 98%;          /* #F8FAFC — slate-50 (fundo do content) */

    /* === RADIUS === */
    --radius: 0.5rem;                   /* 8px — cantos arredondados consistentes */
  }

  /* === DARK MODE === */
  .dark {
    --background: 222 47% 11%;          /* #0F172A — slate-900 */
    --foreground: 210 40% 98%;          /* #F8FAFC — slate-50 */

    --card: 217 33% 17%;               /* #1E293B — slate-800 */
    --card-foreground: 210 40% 98%;
    --popover: 217 33% 17%;
    --popover-foreground: 210 40% 98%;

    --primary: 217 91% 60%;             /* #60A5FA — blue-400 (mais claro no dark) */
    --primary-foreground: 222 47% 11%;

    --secondary: 217 33% 17%;           /* #1E293B — slate-800 */
    --secondary-foreground: 210 40% 98%;

    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;    /* #94A3B8 — slate-400 */

    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 63% 31%;           /* tom de vermelho escuro */
    --destructive-foreground: 210 40% 98%;

    --border: 217 33% 17%;              /* #1E293B — slate-800 */
    --input: 217 33% 17%;
    --ring: 217 91% 60%;

    --sidebar-bg: 224 71% 4%;           /* #020617 — slate-950 (mais escuro ainda) */
    --sidebar-foreground: 215 20% 65%;
    --sidebar-active: 217 91% 60%;
    --sidebar-hover: 222 47% 11%;

    --content-bg: 222 47% 11%;          /* #0F172A */
  }
}
```

### 14.4 Sidebar colapsável

| Estado | Largura | Conteúdo |
|---|---|---|
| Expandida (default desktop) | 256px | Logo + nome "Nexos Financeiro" + itens com texto + badges |
| Colapsada (toggle ou < 1024px) | 64px | Apenas ícone do logo + ícones dos itens + tooltip no hover |

```typescript
// Sidebar state salvo em localStorage('sidebar-collapsed')
// Toggle button: ícone de chevron no footer da sidebar
// Transição: width com transition-all duration-200
// Tooltip: shadcn/ui Tooltip no hover dos ícones quando colapsada
// Badge de aprovações: número visível mesmo colapsada (mini badge no ícone)
```

### 14.5 Cores semânticas (status, badges, gráficos)

| Contexto | Cor | Tailwind | Hex |
|---|---|---|---|
| **Primary / ações** | Azul | `blue-500` | `#3B82F6` |
| **Primary hover** | Azul escuro | `blue-600` | `#2563EB` |
| **Sucesso / Pago / Receita** | Verde | `emerald-500` | `#10B981` |
| **Sucesso light (badge)** | Verde claro | `emerald-50` + `emerald-700` | `#ECFDF5` + `#047857` |
| **Alerta / Aguard. Aprovação** | Âmbar | `amber-500` | `#F59E0B` |
| **Alerta light (badge)** | Âmbar claro | `amber-50` + `amber-700` | `#FFFBEB` + `#B45309` |
| **Erro / Vencido / Despesa** | Vermelho | `red-500` | `#EF4444` |
| **Erro light (badge)** | Vermelho claro | `red-50` + `red-700` | `#FEF2F2` + `#B91C1C` |
| **Parcial** | Roxo | `purple-500` | `#8B5CF6` |
| **Parcial light (badge)** | Roxo claro | `purple-50` + `purple-700` | `#F5F3FF` + `#6D28D9` |
| **Rascunho / Cancelado / Neutro** | Cinza | `slate-400` | `#94A3B8` |
| **Neutro light (badge)** | Cinza claro | `slate-100` + `slate-600` | `#F1F5F9` + `#475569` |
| **Pendente** | Azul claro | `blue-50` + `blue-700` | `#EFF6FF` + `#1D4ED8` |

### 14.6 Mapeamento Status → Cores (atualizado)

```typescript
// lib/constants.ts
export const STATUS_CONFIG: Record<EntryStatus, { label: string; color: string; dot: string }> = {
  DRAFT:              { label: 'Rascunho',           color: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400' },
  PENDING_APPROVAL:   { label: 'Aguard. Aprovação',  color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500' },
  PENDING:            { label: 'Pendente',           color: 'bg-blue-50 text-blue-700',        dot: 'bg-blue-500' },
  PARTIAL:            { label: 'Parcial',            color: 'bg-purple-50 text-purple-700',    dot: 'bg-purple-500' },
  PAID:               { label: 'Pago',               color: 'bg-emerald-50 text-emerald-700',  dot: 'bg-emerald-500' },
  OVERDUE:            { label: 'Vencido',            color: 'bg-red-50 text-red-700',          dot: 'bg-red-500' },
  CANCELLED:          { label: 'Cancelado',          color: 'bg-slate-100 text-slate-500 line-through', dot: 'bg-slate-400' },
};
```

### 14.7 Gráficos (recharts)

| Elemento | Cor | Hex |
|---|---|---|
| Entradas / Receitas | Verde | `#10B981` (emerald-500) |
| Saídas / Despesas | Vermelho | `#EF4444` (red-500) |
| Saldo acumulado (linha) | Azul | `#3B82F6` (blue-500) |
| Projeção futura | Mesmo tom com `opacity: 0.4` | — |
| Donut categorias | Paleta rotativa: `#3B82F6`, `#10B981`, `#F59E0B`, `#EF4444`, `#8B5CF6`, `#EC4899`, `#14B8A6`, `#F97316` | — |

### 14.8 Layout visual

- **Sidebar**: sempre dark (slate-900 light / slate-950 dark) — fixa à esquerda, 256px expandida ou 64px colapsada. Brand: logo "N" (azul) + "Nexos Financeiro"
- **Header**: branco (light) / slate-800 (dark), borda inferior sutil, branch switcher à esquerda + theme toggle + user menu à direita
- **Content area**: fundo `slate-50` (light) / `slate-900` (dark), padding 24px
- **Cards**: fundo branco (light) / `slate-800` (dark), borda `slate-200` / `slate-700`, radius 12px
- **Tabelas**: header `slate-50` / `slate-800`, rows alternados, hover `blue-50` / `blue-900/20`
- **Tipografia**: `Inter` via Google Fonts (com fallback system) — nunca serif em ERP
- **Espaçamento**: múltiplos de 4px (Tailwind default: `p-1`=4px, `p-2`=8px, etc.)
- **Transição de tema**: `transition-colors duration-200` no `<html>` — troca suave

---

## 15. ERROR BOUNDARIES E SUSPENSE

### 15.1 Error Boundary global

```typescript
// app/error.tsx — Next.js Error Boundary automático
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error); // Envia para Sentry automaticamente
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">Algo deu errado</h2>
        <p className="text-slate-500">Um erro inesperado ocorreu. Nossa equipe foi notificada.</p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}
```

### 15.2 Suspense com loading.tsx

Next.js App Router usa `loading.tsx` como Suspense boundary automático para cada rota:

```typescript
// app/financeiro/contas-pagar/loading.tsx
import { TableSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-32 animate-pulse rounded bg-slate-200" />
      </div>
      <TableSkeleton rows={10} cols={7} />
    </div>
  );
}

// app/dashboard/loading.tsx
import { CardSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-slate-200" />
    </div>
  );
}
```

**Regra**: toda rota com dados assíncronos deve ter `loading.tsx`. Next renderiza o skeleton automaticamente enquanto o Server Component ou o Client Component com `useQuery` carrega.

---

## 16. OTIMIZAÇÕES AVANÇADAS

### 16.1 Optimistic Updates (pagamentos)

Quando o usuário registra pagamento, a UI atualiza **imediatamente** sem esperar o backend. Se falhar, reverte.

```typescript
// hooks/use-entries.ts — mutation com optimistic update
export function usePayEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, ...dto }: PayEntryInput & { entryId: string }) =>
      api.post<Payment>(`/entries/${entryId}/pay`, dto, uuid()),

    // Optimistic: atualiza cache ANTES da resposta do backend
    onMutate: async ({ entryId, amount }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.entries.detail(entryId) });
      const previous = queryClient.getQueryData(queryKeys.entries.detail(entryId));

      // Atualiza o cache otimisticamente
      queryClient.setQueryData(queryKeys.entries.detail(entryId), (old: any) => ({
        ...old,
        data: {
          ...old.data,
          status: 'PAID', // Simplificado — na prática calcular com decimal.js
          paidAmount: amount,
        },
      }));

      return { previous }; // Salva estado anterior para rollback
    },

    onError: (_err, _vars, context) => {
      // Rollback: restaura estado anterior
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.entries.detail(_vars.entryId), context.previous);
      }
      toast.error(_err.message);
    },

    onSettled: (_, __, { entryId }) => {
      // Sempre revalida com dados reais do backend
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(branchId, entryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.entries.all(branchId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(branchId) });
    },

    onSuccess: () => {
      toast.success('Pagamento registrado');
    },
  });
}
```

**Usar optimistic updates em**: registrar pagamento, aprovar lançamento, marcar como conciliado. **NÃO usar em**: criação (precisa do document_number do backend), exclusão (ação destrutiva).

### 16.2 Virtualização de tabelas grandes

Se uma filial tiver muitos lançamentos, usar `@tanstack/react-virtual` para renderizar apenas as linhas visíveis:

```typescript
// Adicionar na stack:
// @tanstack/react-virtual

// components/shared/data-table.tsx — quando total > 300 linhas
// Usa virtualizer para renderizar apenas ~20 linhas visíveis
// Scroll suave, sem travar o browser
```

**Quando aplicar**: se `meta.total > 300` na resposta paginada, ativar virtualização. Abaixo disso, tabela normal (mais simples).

### 16.3 Telemetria (Sentry + analytics)

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,      // 10% das transactions para performance
  replaysSessionSampleRate: 0, // Replays desabilitado por padrão
});

// Uso automático:
// - app/error.tsx captura crashes via Sentry.captureException
// - ApiError no api-client.ts captura erros 500 via Sentry.captureException
// - Performance traces automáticos nas rotas
```

---

## 17. RESPONSIVIDADE

- **Desktop first** — ERP é usado primariamente em desktop
- **Sidebar**: colapsável em telas < 1024px (ícones only, tooltip com nome)
- **Tabelas**: scroll horizontal em mobile com `overflow-x-auto`
- **Formulários**: 2 colunas em desktop (`grid grid-cols-2 gap-6`), 1 coluna em mobile
- **Dashboard cards**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Breakpoints Tailwind**: `lg:` para layout principal, `md:` para ajustes menores

---

## 18. RISCOS E MITIGAÇÕES (ler antes de implementar)

### 18.1 EntryForm — o componente mais complexo do sistema

O formulário de lançamento concentra: parcelamento com preview, upload de anexo, autocomplete de contato, select de categoria filtrado por tipo, CurrencyInput com decimal.js, validação cruzada de datas, toggle de parcelamento que revela campos condicionais.

**Risco**: se construir tudo num arquivo só, vira 600+ linhas ingerenciáveis.

**Mitigação**: já dividido na estrutura de pastas em 6 subcomponentes:
```
entry-form/
  index.tsx              — form provider (react-hook-form), submit, botões
  basic-info.tsx         — descrição, contato (autocomplete), observações
  financial-info.tsx     — valor, categoria, conta bancária, forma pagamento
  dates-info.tsx         — data emissão, data vencimento
  installment-section.tsx — toggle + num parcelas + frequência + preview (decimal.js)
  attachments-section.tsx — upload drag-and-drop (presigned URL → R2)
```

O `index.tsx` cria o `useForm()` e passa `control` + `watch` + `setValue` para os subcomponentes via props. Cada subcomponente é independente e testável.

**Hook de lógica** — além da divisão em subcomponentes, extrair a lógica do formulário para um hook dedicado:

```typescript
// hooks/use-entry-form.ts
// Encapsula: useForm, watch de parcelamento, cálculo de parcelas (decimal.js),
// validações cruzadas (dueDate >= issueDate), loading de categorias/contatos,
// submit com idempotency key, redirect após sucesso.
//
// O componente entry-form/index.tsx fica APENAS com JSX — zero lógica.
export function useEntryForm(type: 'PAYABLE' | 'RECEIVABLE', entryId?: string) {
  const form = useForm<CreateEntryInput>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: { type, issueDate: today(), installment: false },
  });

  const { data: existingEntry } = useEntry(entryId ?? '');
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  // Watch parcelamento para calcular preview
  const isInstallment = form.watch('installment');
  const installmentCount = form.watch('installmentCount');
  const amount = form.watch('amount');

  const installmentPreview = useMemo(() => {
    if (!isInstallment || !installmentCount || !amount) return [];
    return new EntryCalculator().calculateInstallments(amount, installmentCount);
  }, [isInstallment, installmentCount, amount]);

  const onSubmit = form.handleSubmit((data) => {
    if (entryId) updateEntry.mutate({ id: entryId, ...data });
    else createEntry.mutate(data);
  });

  const isPending = createEntry.isPending || updateEntry.isPending;

  return { form, onSubmit, isPending, installmentPreview, existingEntry };
}
```

### 18.2 DataTable — infraestrutura crítica

A `DataTable` será usada em 10+ telas. Se for mal construída, tudo sofre.

**Risco**: construir manualmente com `<table>` + state local → impossível manter sorting, pagination, selection, virtualização.

**Mitigação**: basear em **@tanstack/react-table** (headless). Ele fornece:
- `useReactTable()` com sorting, pagination, row selection built-in
- Column definitions tipadas (`ColumnDef<T>[]`)
- Integração limpa com shadcn/ui `Table` para o visual
- Virtualização via `@tanstack/react-virtual` quando necessário

**Implementar na Fase 3** (componentes base) e testar com dados mock antes de plugar nas telas.

**Teste obrigatório antes de prosseguir para Fase 4**: gerar 1000 registros mock, testar sorting por todas as colunas, selection com checkbox, paginação (prev/next/jump), e virtualização ativada. Se DataTable não funcionar perfeito com mock, não conectar API.

### 18.3 Conciliação bancária — a UI mais difícil

A tela de conciliação tem: split view (extrato x lançamentos), matching visual, confirm/reject/create, drag para conectar itens.

**Risco**: é a tela mais complexa do sistema. Se tentar construir cedo, trava o progresso.

**Mitigação**: deixar para **último módulo** (Fase 7, item 52). Todas as outras telas são mais simples e validam a infraestrutura (DataTable, hooks, api-client). Quando chegar na conciliação, a base estará sólida.

**State management da conciliação**: usar `useReducer` (não `useState`) porque o estado é complexo e interdependente:
```typescript
// Estado da conciliação — múltiplas peças que mudam juntas
interface ReconciliationState {
  statements: BankStatement[];       // Itens do extrato
  entries: FinancialEntry[];         // Lançamentos do ERP
  suggestedMatches: Match[];         // Matches sugeridos pelo algoritmo
  confirmedMatches: Match[];         // Matches confirmados pelo usuário
  selectedStatementId: string | null;
  selectedEntryId: string | null;
}

type ReconciliationAction =
  | { type: 'CONFIRM_MATCH'; statementId: string; entryId: string }
  | { type: 'REJECT_MATCH'; statementId: string }
  | { type: 'SELECT_STATEMENT'; id: string }
  | { type: 'CREATE_ENTRY_FROM_STATEMENT'; statementId: string }
  | { type: 'RESET' };

// useReducer gerencia transições previsíveis — useState com 6+ estados vira espaguete
```

### 18.4 Recharts performance

Recharts pode travar o browser com muitos data points (especialmente em dispositivos mais fracos).

**Risco**: dashboard com gráfico de 365 dias trava a UI.

**Mitigação**: **máximo 24 data points por gráfico**. Para o dashboard (12 meses) já está OK. Para fluxo de caixa diário, agregar os dados antes de renderizar (ex: agrupar por semana se período > 3 meses). Se precisar de mais pontos no futuro, migrar para `@nivo/line` (canvas-based, mais performante que recharts com SVG).

### 18.5 Optimistic Updates podem dessincronizar

Se o backend rejeita uma operação que a UI já mostrou como sucesso, o usuário vê um "flash" de rollback.

**Risco**: UX confusa se o backend retorna erro após o cache já foi atualizado otimisticamente.

**Mitigação**: usar optimistic **APENAS** em ações de baixo risco de falha (pagamento, aprovação). Para ações que podem falhar por regras complexas (criar com aprovação, estorno com prazo), usar o fluxo normal (loading → success/error). O `onSettled` sempre revalida com dados reais do backend.

---

## 19. ORDEM DE IMPLEMENTAÇÃO (seguir exatamente)

**NÃO construir tudo de uma vez.** Cada fase só começa quando a anterior funciona.

### Fase 1 — Infraestrutura (primeiro — sem isso nada funciona)
```
1. next.config.ts + tsconfig (strict: true)
2. styles/globals.css (CSS variables do design system)
3. Instalar shadcn/ui + configurar componentes base
4. middleware.ts (raiz do src — auth redirect)
5. providers/ (QueryProvider, AuthProvider, BranchProvider, ToastProvider)
6. lib/api-client.ts + lib/api-server.ts
7. lib/query-keys.ts
8. lib/types.ts (todas as interfaces)
9. lib/format.ts + lib/validators.ts + lib/constants.ts
10. app/layout.tsx (root layout com todos os providers)
11. app/error.tsx (error boundary global)
```

### Fase 2 — Layout Shell (sidebar + header + branch switcher)
```
12. components/layout/sidebar.tsx (menu lateral dark)
13. components/layout/header.tsx (branch switcher + user menu)
14. components/layout/branch-switcher.tsx
15. components/layout/user-menu.tsx
16. components/layout/page-header.tsx
17. hooks/use-auth.ts + hooks/use-branch.ts + hooks/use-permissions.ts
18. components/shared/permission-gate.tsx
```

### Fase 3 — Componentes base reutilizáveis
```
19. components/shared/data-table.tsx (tabela paginada genérica)
20. components/shared/currency-input.tsx
21. components/shared/document-input.tsx + phone-input.tsx + cep-input.tsx
22. components/shared/date-picker.tsx
23. components/shared/money-display.tsx
24. components/shared/status-badge.tsx + category-badge.tsx
25. components/shared/empty-state.tsx + error-banner.tsx
26. components/shared/confirm-dialog.tsx
27. components/shared/loading-skeleton.tsx (table, card, form variants)
28. components/shared/file-upload.tsx
```

### Fase 4 — Dashboard (primeira tela visual)
```
29. hooks/use-dashboard.ts
30. components/features/dashboard/summary-cards.tsx
31. components/features/dashboard/cashflow-chart.tsx
32. components/features/dashboard/expense-donut.tsx
33. components/features/dashboard/overdue-list.tsx
34. app/dashboard/page.tsx + loading.tsx
```

### Fase 5 — Contas a Pagar (fluxo core)
```
35. hooks/use-entries.ts + hooks/use-categories.ts + hooks/use-contacts.ts
36. components/features/entries/entry-filters.tsx
37. components/features/entries/entries-table.tsx
38. app/financeiro/contas-pagar/page.tsx + loading.tsx
39. components/features/entries/entry-form.tsx + installment-preview.tsx
40. app/financeiro/contas-pagar/nova/page.tsx
41. components/features/entries/entry-detail.tsx
42. components/features/entries/payment-modal.tsx
43. components/features/entries/cancel-modal.tsx + refund-modal.tsx
44. app/financeiro/contas-pagar/[id]/page.tsx
```

### Fase 6 — Contas a Receber (reutiliza 90% dos componentes)
```
45. app/financeiro/contas-receber/* (reutiliza entry-form, entries-table, etc. com type='RECEIVABLE')
```

### Fase 7 — Módulos secundários
```
46. Categorias (category-tree + form)
47. Transferências (transfer-form)
48. Aprovações (approval-list + actions)
49. Configurações (bank-accounts-crud + settings + lock-period)
50. Relatórios (DRE, balancete, aging)
51. Fluxo de caixa (cashflow-detailed)
52. Conciliação (upload + split-view + match)
53. Boletos (boleto-list)
54. Auditoria (audit log table)
55. Régua de cobrança (rules-list + template-editor)
```

---

## 20. REGRAS FINAIS DO FRONTEND

**Tipagem e precisão:**
- **Sem `any`** — TypeScript strict mode. Usar `unknown` + type guard onde necessário
- **Sem `number` para dinheiro** — sempre `string`, formatação com `Intl.NumberFormat(new Decimal(v).toNumber())`, cálculos com `decimal.js`
- **Limitar string antes de Decimal** — `z.string().max(15)` no zod ANTES de `new Decimal()` (previne DoS)
- **Sem CSS-in-JS** — apenas Tailwind classes + shadcn/ui + CSS variables

**Autenticação:**
- **Cookie HTTP-only não é legível por JS** — `document.cookie` NÃO funciona para `access_token`
- **JWT decode via `jose`** — seguro, Edge compatible, sem decode manual com `atob`
- **JWT decode no Server Component** — `layout.tsx` lê cookie via `cookies()`, decodifica com `jose`, passa `initialUser` para AuthProvider
- **AuthProvider recebe user pronto** — Client Component, zero acesso a cookie
- **Middleware verifica `exp`** — `jose.decodeJwt()` funciona no Edge Runtime. Token expirado = redirect para login
- **`middleware.ts` na raiz do `src/`** — NUNCA dentro de `app/`
- **Decode é só para UI** (nome, email) — NUNCA para lógica de segurança

**Data fetching:**
- **Sem fetch direto** — Client Components: `api-client.ts` + TanStack Query. Server Components: `api-server.ts`
- **`cache: 'no-store'`** em `serverFetch` — requests com Cookie são dinâmicos no Next, `revalidate` causa inconsistência
- **`export const dynamic = 'force-dynamic'`** em toda page que usa `serverFetch`
- **Hydration para evitar double fetch** — Server prefetch + `dehydrate` + `HydrationBoundary` + `useQuery` no client (seção 6.2)
- **Hydration NÃO é obrigatória em toda page** — apenas dashboard e detalhe. Listagens com filtros fazem fetch só no client

**Query keys:**
- **`branchId` na query key** para dados financeiros — isola cache por filial sem `clear()`
- **`stableKey()`** para serializar objetos (filtros) — `JSON.stringify` com `.sort()` nas keys
- **NUNCA strings soltas** — sempre `queryKeys.entries.all(branchId)`, nunca `['entries']`
- **Contacts, roles, permissions** — nível tenant, SEM branchId na key

**Troca de filial:**
- **NÃO usar `queryClient.clear()`** — `branchId` na query key isola cache automaticamente
- **Cache da filial anterior fica intacto** — reutilizado se o usuário voltar (zero refetch)
- **TanStack Query faz fetch da nova filial** via mudança na query key

**DataTable:**
- **100% server-driven** — sorting, pagination, filtros: TUDO enviado para API. ZERO sorting client-side
- **Baseada em `@tanstack/react-table`** (headless) + shadcn/ui Table (visual)
- **Virtualização** — ativar `@tanstack/react-virtual` se `meta.total > 300`
- **Testar com 1000 registros mock** antes de conectar API

**UX:**
- **3 estados em toda listagem** — skeleton (`loading.tsx`), error banner, empty state
- **Toast agrupado em lote** — 5 pagamentos = 1 toast ("5 pagamentos registrados"), não 5 toasts
- **Optimistic updates** apenas em ações de baixo risco (pagamento, aprovação) — não em criação/estorno
- **Permissão verificada antes de exibir** — `PermissionGate` para botões/ações, menu filtrado

**Formulários:**
- **Validação client-side com zod** — todo formulário tem schema tipado
- **`useEntryForm` hook** — separa lógica do JSX no formulário mais complexo do sistema
- **Campos formatados com máscara** — CPF, CNPJ, telefone, CEP, moeda
- **Datas exibidas DD/MM/YYYY** — enviadas YYYY-MM-DD para API

**Conciliação bancária:**
- **Último módulo** a implementar (Fase 7)
- **`useReducer`** para state management — useState com 6+ estados vira espaguete

**Geral:**
- **Feature modules auto-contidos** — `features/entries/` contém `components/`, `hooks/`, `types/`. Imports entre features: proibidos (usar API types compartilhados)
- **Domain models em `features/`** — `Entry` fica em `features/entries/types/`. `lib/api-types.ts` só tem wrappers genéricos
- **File upload com retry** — XMLHttpRequest para progress bar + 3 tentativas com backoff se falhar
- **Sentry** — error tracking + performance monitoring em produção
- **Recharts max 24 data points** — SVG trava com mais. Futuro: `@nivo/line` (canvas)
- **Filtros sincronizados na URL** — `nuqs` para query params tipados
- **Idempotency key** em mutations — `uuid()` em create, pay, cancel, refund, transfer
- **Tema claro/escuro** — `next-themes` com toggle no header, CSS variables completas
- **Sidebar colapsável** — 256px expandida, 64px colapsada, estado em localStorage
- **BranchProvider estabilizado** — `useMemo` no context value + `useCallback` no switchBranch (previne render storm)
- **QueryClient singleton** — NUNCA importar o singleton em Server Components (criar local com `new QueryClient()` para prefetch)
- **Pages (`page.tsx`) são finas** — delegam para componentes em `features/`
- **Não inventar telas** — implementar APENAS as 15 telas da seção 12
- **Seguir a ordem de implementação** da seção 19