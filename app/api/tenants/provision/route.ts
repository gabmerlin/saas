// app/api/tenants/provision/route.ts

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Validation minimale : on exige subdomain string non vide ici, le détail est revalidé côté /domains
    const sub = typeof body?.subdomain === 'string' ? body.subdomain.trim().toLowerCase() : '';
    if (!sub) {
      return NextResponse.json(
        { ok: false, code: 'invalid_payload', error: 'subdomain is required' },
        { status: 400 },
      );
    }

    const secret = process.env.DOMAIN_PROVISIONING_SECRET;
    if (!secret) {
      return NextResponse.json(
        { ok: false, code: 'server_misconfig', error: 'DOMAIN_PROVISIONING_SECRET not set' },
        { status: 500 },
      );
    }

    // Appel de l’API interne qui gère DB + Vercel + OVH
    // NB: on reste en same-origin; req.nextUrl construit une URL absolue solide en preview/prod.
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

    // Propage la réponse telle quelle (texte JSON)
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, code: 'wrapper_failed', error: `Wrapper failed: ${message}` },
      { status: 500 },
    );
  }
}
