# Arquitectura de Autenticação — NÃO ALTERAR SEM LER

## Fluxo SSO
```
Browser → erp.zonadev.tech
  → middleware.ts verifica cookie erp_access_token
  → se expirado: troca zonadev_sid por erp_access_token via /api/oauth/token
  → se sem sessão: redirect para auth.zonadev.tech/login?app=erp.zonadev.tech&redirect=...
  → página carrega
  → AuthProvider chama /api/v1/users/me (via proxy Next.js)
  → proxy injeta Authorization: Bearer erp_access_token
  → backend valida JWT via JWKS
```

## Atualizações importantes (cliente/servidor)

- Server: novo endpoint `GET /api/auth/reauth` — constrói a `loginUrl` server-side e retorna `{ loginUrl }`. Isso garante que parâmetros sensíveis (`app`, `redirect`) e o domínio do Auth permanecem no lado servidor; ver [src/app/api/auth/reauth/route.ts](src/app/api/auth/reauth/route.ts#L1-L20).

- Cliente: centralização do tratamento de 401 via wrapper `httpFetch` em [src/lib/http-client.ts](src/lib/http-client.ts#L1-L200). O wrapper adiciona `credentials: 'include'` obrigatoriamente e expõe `registerUnauthorizedHandler(handler)` para que o aplicativo reaja a 401 sem realizar redirects automáticos.

- AuthProvider: removido redirect automático em respostas 401. Agora, quando `/api/v1/users/me` retornar 401, o `AuthProvider`:
  - limpa estado local (`user`, `permissions`, `branches`),
  - define `isAuthenticated = false` e `needsReauth = true`,
  - expõe `reauthenticate()` que chama `/api/auth/reauth?redirect=<current>` e redireciona o browser para a `loginUrl` retornada.
  - renderiza um banner visual (não intrusivo) quando `needsReauth === true` com um botão "Reautenticar" que dispara `reauthenticate()`.

- Comportamento de 401: o interceptor (`httpFetch`) é responsável apenas por sinalizar o evento (invocar o handler). A decisão de UX (mostrar banner, redirecionar) fica no `AuthProvider` para manter autoridade centralizada e previsibilidade.

## Regras críticas atualizadas — NUNCA alterar

1. Não tentar renovar token ou manipular cookies no cliente. Token exchange continua sendo tarefa do `middleware` e dos endpoints server-side.

2. `API_BASE` deve permanecer `'/api/v1'` para usar o proxy Next.js que injeta o `Authorization` server-side.

3. Evitar redirects automáticos dispersos no cliente — centralizar em `AuthProvider` e middleware.

## Ficheiros novos/alterados nesta iteração

- `src/app/api/auth/reauth/route.ts` — endpoint que constrói `loginUrl` server-side.
- `src/lib/http-client.ts` — `httpFetch` + `registerUnauthorizedHandler`.
- `src/lib/api-client.ts` — usa `httpFetch` para garantir credentials e tratamento centralizado de 401.
- `src/providers/auth-provider.tsx` — adiciona `needsReauth`, `isAuthenticated`, `reauthenticate()` e banner.

## Observações

- Este fluxo preserva o `middleware` como autoridade para verificação/renovação de cookies e evita colisões de domínio/nome de cookie conforme definido na secção "Regras críticas".
- Se for necessário um comportamento automático diferente (ex.: iniciar silent reauth server-side), isso deve ser implementado por endpoints server-side que respeitem o contrato do Auth — NÃO pelo cliente.


## Regras críticas — NUNCA alterar

### 1. Cookie name
```typescript
// CORRECTO
const COOKIE_NAME = 'erp_access_token'; // scoped ao ERP

// ERRADO — causa colisão com Renowa e ZonaDev Auth
const COOKIE_NAME = 'access_token';
```

### 2. Cookie domain
```typescript
// CORRECTO — scoped ao ERP
domain: 'erp.zonadev.tech'

// ERRADO — colide com outras apps
domain: '.zonadev.tech'
```

### 3. Login redirect params
```typescript
// CORRECTO
loginUrl.searchParams.set('app', APP_AUD);
loginUrl.searchParams.set('redirect', url);

// ERRADO — Auth não reconhece estes params
loginUrl.searchParams.set('aud', APP_AUD);
loginUrl.searchParams.set('redirect_uri', url);
```

### 4. API_BASE no api-client
```typescript
// CORRECTO — usa proxy Next.js que injeta o Bearer
const API_BASE = '/api/v1';

// ERRADO — bypassa o proxy, requests chegam sem autenticação
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_BASE = 'https://api-erp.zonadev.tech/api/v1';
```

### 5. next.config.mjs — SEM rewrites para /api/v1
```javascript
// CORRECTO — o route handler src/app/api/v1/[...path]/route.ts faz o proxy
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

// ERRADO — bypassa o route handler, requests chegam sem Authorization header
async rewrites() {
  return [{ source: '/api/v1/:path*', destination: '...' }];
}
```

### 6. Proxy route — cookie correcto
```typescript
// Em src/app/api/v1/[...path]/route.ts
// CORRECTO
const token = req.cookies.get('erp_access_token')?.value;

// ERRADO
const token = req.cookies.get('access_token')?.value;
```

## Ficheiros protegidos — NÃO TOCAR
- `src/middleware.ts`
- `src/providers/auth-provider.tsx`
- `src/providers/branch-provider.tsx`
- `src/app/api/v1/[...path]/route.ts`
- `next.config.mjs`

## Arquitectura multi-app (ZonaDev)
- `zonadev_sid` — cookie central, domain `.zonadev.tech`, emitido pelo Auth
- `erp_access_token` — cookie do ERP, domain `erp.zonadev.tech`, criado via token exchange
- `admin_access_token` — cookie do Auth admin, domain `auth.zonadev.tech`
- Renowa — SPA, usa token em memória, sem cookie persistente

Cada app tem o seu cookie scoped ao próprio subdomínio.
Isso evita colisão — login no ERP não afecta sessão do Renowa.
