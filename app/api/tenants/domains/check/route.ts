// app/api/tenants/domains/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUB_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function supabaseAnon(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function vercelDomainExists(fqdn: string): Promise<boolean> {
  const { VERCEL_PROJECT_ID, VERCEL_TOKEN } = process.env;
  if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) {
    // si non configuré, on ne bloque pas mais on considère "inconnu"
    throw new Error('VERCEL_PROJECT_ID / VERCEL_TOKEN not set');
  }

  const VERCEL_API = 'https://api.vercel.com';
  const GET_VER = 'v9';

  // lookup direct
  const r1 = await fetch(
    `${VERCEL_API}/${GET_VER}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(fqdn)}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' }
  );
  if (r1.status === 200) return true;
  if (r1.status === 404) return false;

  // fallback: liste
  const r2 = await fetch(
    `${VERCEL_API}/${GET_VER}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' }
  );
  if (!r2.ok) throw new Error(`Vercel list failed: ${r2.status}`);
  const data = (await r2.json()) as { domains?: Array<{ name: string }> };
  return (data.domains ?? []).some((d) => d.name === fqdn);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // rétro-compat: ?sub=foo OU ?subdomain=foo
  const sub = (url.searchParams.get('subdomain') ?? url.searchParams.get('sub') ?? '')
    .trim()
    .toLowerCase();
  const root = (process.env.PRIMARY_ZONE ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '')
    .trim()
    .toLowerCase();

  if (!sub || !SUB_RE.test(sub) || sub === 'www') {
    const fqdn = root ? `${sub}.${root}` : sub;
    return NextResponse.json({ ok: true, available: false, domain: fqdn, reason: 'invalid_subdomain' });
  }
  if (!root) {
    return NextResponse.json(
      { ok: false, reason: 'root_zone_missing', error: 'PRIMARY_ZONE / NEXT_PUBLIC_ROOT_DOMAIN not set' },
      { status: 500 }
    );
  }

  const fqdn = `${sub}.${root}`;
  const sb = supabaseAnon();

  // 1) Vérif DB (si RPC présentes)
  try {
    const s1 = await sb.rpc('subdomain_exists', { p_subdomain: sub });
    if (!s1.error && s1.data === true) {
      return NextResponse.json({ ok: true, available: false, domain: fqdn, source: 'tenants', reason: 'already_in_db' });
    }
    const s2 = await sb.rpc('domain_exists', { p_domain: fqdn });
    if (!s2.error && s2.data === true) {
      return NextResponse.json({ ok: true, available: false, domain: fqdn, source: 'tenant_domains', reason: 'already_in_db' });
    }
  } catch {
    // on continue vers Vercel
  }

  // 2) Vérif Vercel (source de vérité routing)
  try {
    const taken = await vercelDomainExists(fqdn);
    if (taken) {
      return NextResponse.json({ ok: true, available: false, domain: fqdn, source: 'vercel', reason: 'vercel_domain_exists' });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `Vercel check failed: ${msg}`, reason: 'vercel_check_failed' }, { status: 500 });
  }

  // 3) Disponible
  return NextResponse.json({ ok: true, available: true, domain: fqdn });
}
