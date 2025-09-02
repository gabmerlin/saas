// app/api/tenants/provision/route.ts
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret = process.env.DOMAIN_PROVISIONING_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: 'DOMAIN_PROVISIONING_SECRET not set' },
        { status: 500 },
      );
    }

    // On appelle l’API interne qui fait le vrai travail OVH+Vercel
    const res = await fetch(new URL('/api/tenants/domains', req.nextUrl).toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-provisioning-secret': secret,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `Wrapper failed: ${e?.message ?? String(e)}` },
      { status: 500 },
    );
  }
}
