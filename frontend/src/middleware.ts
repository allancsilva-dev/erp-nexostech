import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.zonadev.tech';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.zonadev.tech';
const APP_AUD = process.env.NEXT_PUBLIC_APP_AUDIENCE ?? 'erp.zonadev.tech';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'erp_access_token';
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

  // Token exchange: zonadev_sid -> erp_access_token.
  const sid = req.cookies.get('zonadev_sid')?.value;
  if (sid) {
    try {
      const tokenRes = await fetch(`${AUTH_URL}/oauth/token?aud=${APP_AUD}`, {
        headers: { Cookie: `zonadev_sid=${sid}` },
        signal: AbortSignal.timeout(3000),
      });

      if (tokenRes.ok) {
        const data = (await tokenRes.json()) as {
          access_token: string;
          expires_in: number;
        };

        const response = NextResponse.next();
        response.cookies.set(COOKIE_NAME, data.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          domain: 'erp.zonadev.tech',
          maxAge: data.expires_in,
          path: '/',
        });

        return response;
      }
    } catch {
      // Fallback para redirect de login.
    }
  }

  const loginUrl = new URL(`${AUTH_URL}/login`);
  loginUrl.searchParams.set('app', APP_AUD);
  loginUrl.searchParams.set(
    'redirect',
    APP_URL + req.nextUrl.pathname + req.nextUrl.search,
  );

  return NextResponse.redirect(loginUrl);
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    ) as { exp?: number };

    if (!payload.exp) return true;
    return Date.now() >= (payload.exp * 1000) - 60_000;
  } catch {
    return true;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
