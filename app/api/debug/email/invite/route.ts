import { NextResponse, type NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Body = { email: string; locale?: 'fr' | 'en' };

function svc(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-provisioning-secret') ?? '';
    if (!secret || secret !== (process.env.DOMAIN_PROVISIONING_SECRET ?? '')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { email, locale = 'fr' } = (await req.json().catch(() => ({}))) as Body;
    if (!email || !isEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }

    const sb = svc();
    const redirectTo = `${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/${locale}`;
    const res = await sb.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (res.error) {
      return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId: res.data.user?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
