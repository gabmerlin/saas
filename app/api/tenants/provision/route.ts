import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const secret = process.env.DOMAIN_PROVISIONING_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: 'DOMAIN_PROVISIONING_SECRET not set' },
        { status: 500 },
      );
    }

    // Appel de l’API interne qui gère OVH + Vercel
    const target = new URL('/api/tenants/domains', req.nextUrl).toString();
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-provisioning-secret': secret,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    // On propage la réponse telle quelle
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Wrapper failed: ${message}` },
      { status: 500 },
    );
  }
}
