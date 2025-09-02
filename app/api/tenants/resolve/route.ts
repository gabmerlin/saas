import { NextRequest, NextResponse } from 'next/server';
import { getSubdomainFromHost } from '@/lib/tenant';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const sub = getSubdomainFromHost(host);
  if (!sub) return NextResponse.json({ ok: true, tenant: null, reason: 'no-subdomain' });

  const { data, error } = await supabaseAdmin.rpc('tenant_id_by_subdomain', { p_subdomain: sub });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tenant: data?.[0] ?? null, subdomain: sub });
}
