import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const loginUrl = new URL('https://auth.zonadev.tech');
  loginUrl.searchParams.set('aud', 'erp.zonadev.tech');
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);

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
