import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? 'https://auth.zonadev.tech';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const audience = process.env.NEXT_PUBLIC_APP_AUDIENCE ?? 'erp.zonadev.tech';
  const loginUrl = new URL('/login', authUrl);
  loginUrl.searchParams.set('aud', audience);
  loginUrl.searchParams.set('redirect', `${appUrl}${request.nextUrl.pathname}`);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = decodeJwt(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
