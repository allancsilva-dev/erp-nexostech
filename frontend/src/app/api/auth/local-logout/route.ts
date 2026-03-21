import { NextResponse } from 'next/server';

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN ?? 'erp.zonadev.tech';

export async function GET() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('erp_access_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    domain: COOKIE_DOMAIN,
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('branch_id', '', {
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function POST() {
  return GET();
}
