import { NextRequest, NextResponse } from 'next/server'

const AUTH_BASE = 'https://auth.zonadev.tech/login'
const APP_AUD = process.env.APP_AUD ?? process.env.NEXT_PUBLIC_APP_AUDIENCE ?? 'erp.zonadev.tech'

export async function GET(req: NextRequest) {
  const redirect = req.nextUrl.searchParams.get('redirect') || '/'

  const loginUrl = `${AUTH_BASE}?app=${APP_AUD}&redirect=${encodeURIComponent(redirect)}`

  return NextResponse.json({ loginUrl })
}
