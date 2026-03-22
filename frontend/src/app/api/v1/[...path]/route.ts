import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_INTERNAL_URL ?? 'http://backend:3001/api/v1';

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/');
  const search = req.nextUrl.search ?? '';
  const url = `${BACKEND_URL}/${path}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookie = req.headers.get('cookie');
  if (cookie) headers['cookie'] = cookie;

  const authorization = req.headers.get('authorization');
  if (authorization) headers['authorization'] = authorization;

  if (!headers.authorization) {
    const token = req.cookies.get('erp_access_token')?.value;
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
  }

  const xBranchId = req.headers.get('x-branch-id');
  if (xBranchId) headers['x-branch-id'] = xBranchId;

  const body = req.method !== 'GET' && req.method !== 'DELETE'
    ? await req.text()
    : undefined;

  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
    credentials: 'include',
  });

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
