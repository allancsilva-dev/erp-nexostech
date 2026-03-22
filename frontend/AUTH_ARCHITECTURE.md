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
