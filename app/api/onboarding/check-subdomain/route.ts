import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { subdomainRegex, reservedSubdomains } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').toLowerCase();

  if (!subdomainRegex.test(q) || reservedSubdomains.has(q)) {
    return NextResponse.json({ ok: true, available: false, reason: 'invalid' });
  }

  const { data, error } = await supabaseAdmin.rpc('tenant_id_by_subdomain', { p_subdomain: q });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const available = !(data && (data as unknown[]).length > 0);
  return NextResponse.json({ ok: true, available });
}
