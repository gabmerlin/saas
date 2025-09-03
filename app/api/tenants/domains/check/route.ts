import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/ratelimit';

export const dynamic = 'force-dynamic';

const SUB_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/; // aligné sur ton CHECK de tenants.subdomain

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sub = (url.searchParams.get('sub') || '').trim().toLowerCase();
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').trim().toLowerCase();

  if (!sub || !SUB_RE.test(sub) || sub === 'www') {
    return NextResponse.json({ ok: false, reason: 'invalid_subdomain' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const limited = await rateLimit(`domcheck:${ip}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const domain = `${sub}.${root}`;
  const supabase = createClient({ serviceRole: false });

  // 1) Collision sur tenants.subdomain ?
  const subExists = await supabase.rpc('subdomain_exists', { p_subdomain: sub });
  if (subExists.error) {
    return NextResponse.json({ ok: false, reason: 'rpc_error', details: subExists.error.message }, { status: 500 });
  }
  if (subExists.data === true) {
    return NextResponse.json({ ok: true, available: false, domain, source: 'tenants' });
  }

  // 2) Collision sur tenant_domains.domain ?
  const domExists = await supabase.rpc('domain_exists', { p_domain: domain });
  if (domExists.error) {
    return NextResponse.json({ ok: false, reason: 'rpc_error', details: domExists.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    available: domExists.data === false,
    domain,
    source: domExists.data ? 'tenant_domains' : null
  });
}
