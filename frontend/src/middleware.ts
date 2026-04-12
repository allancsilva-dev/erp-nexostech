import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.zonadev.tech';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.zonadev.tech';
const CLIENT_ID = process.env.OIDC_CLIENT_ID ?? 'erp-nexostech';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'erp_access_token';
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;
const PUBLIC_PATHS = ['/login', '/api/', '/_next', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  // Rotas publicas - nao verificar auth.
  if (PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(COOKIE_NAME)?.value;

  // Cookie do ERP existe e nao expirou.
  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  // Inicia o fluxo Authorization Code + PKCE para obter um token proprio do ERP.
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const codeVerifier = base64url(verifierBytes);

  const challengeBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = base64url(new Uint8Array(challengeBuffer));

  // State aleatorio protege o callback contra CSRF durante a troca do code.
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = base64url(stateBytes);

  const authorizeUrl = new URL(`${AUTH_URL}/oauth/authorize`);
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('scope', 'openid');

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 300,
  };

  response.cookies.set('erp_oauth_state', state, cookieOptions);
  response.cookies.set('erp_oauth_verifier', codeVerifier, cookieOptions);
  response.cookies.set(
    'erp_oauth_return',
    req.nextUrl.pathname + req.nextUrl.search,
    cookieOptions,
  );

  return response;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    ) as { exp?: number };

    if (!payload.exp) return true;
    // Margem curta evita navegar com um token prestes a expirar.
    return Date.now() >= (payload.exp * 1000) - 60_000;
  } catch {
    return true;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
