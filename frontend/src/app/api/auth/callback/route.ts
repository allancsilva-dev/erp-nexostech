import { NextRequest, NextResponse } from 'next/server';

const AUTH_URL = process.env.AUTH_URL ?? 'https://auth.zonadev.tech';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.zonadev.tech';
const CLIENT_ID = process.env.OIDC_CLIENT_ID ?? 'erp-nexostech';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'erp_access_token';
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=missing_params', APP_URL));
  }

  const savedState = req.cookies.get('erp_oauth_state')?.value;
  const codeVerifier = req.cookies.get('erp_oauth_verifier')?.value;
  const returnTo = req.cookies.get('erp_oauth_return')?.value ?? '/';

  // O state compartilhado via cookie impede que um code externo seja aceito.
  if (!savedState || state !== savedState) {
    return clearOidcCookies(
      NextResponse.redirect(new URL('/login?error=invalid_state', APP_URL)),
    );
  }

  if (!codeVerifier) {
    return clearOidcCookies(
      NextResponse.redirect(new URL('/login?error=missing_verifier', APP_URL)),
    );
  }

  try {
    const tokenRes = await fetch(`${AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text().catch(() => 'unknown');
      console.error('[OIDC callback] Token exchange failed:', tokenRes.status, errorBody);

      return clearOidcCookies(
        NextResponse.redirect(
          new URL('/login?error=token_exchange_failed', APP_URL),
        ),
      );
    }

    const data = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      token_type: string;
      scope: string;
    };

    const response = NextResponse.redirect(new URL(normalizeReturnTo(returnTo), APP_URL));
    response.cookies.set(COOKIE_NAME, data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: 'erp.zonadev.tech',
      maxAge: data.expires_in,
      path: '/',
    });

    return clearOidcCookies(response);
  } catch (error) {
    console.error('[OIDC callback] Error:', error);

    return clearOidcCookies(
      NextResponse.redirect(new URL('/login?error=callback_error', APP_URL)),
    );
  }
}

function clearOidcCookies(response: NextResponse) {
  response.cookies.delete('erp_oauth_state');
  response.cookies.delete('erp_oauth_verifier');
  response.cookies.delete('erp_oauth_return');
  return response;
}

function normalizeReturnTo(returnTo: string) {
  return returnTo.startsWith('/') ? returnTo : '/';
}