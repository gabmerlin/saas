import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

type Json = Record<string, unknown>;
const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const reserved = new Set(['www','api','app','admin','owner','mail','ftp','vercel','static','assets']);

function redirectToUrl(tenantSub?: string): string {
  const base = (process.env.APP_BASE_URL ?? '').replace(/\/+$/, '');
  const cb = base ? `${base}/auth/callback` : 'http://localhost:3000/auth/callback';
  return tenantSub ? `${cb}?sub=${encodeURIComponent(tenantSub)}` : cb;
}


export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Json;
  const name = String(body?.name ?? '');
  const subdomain = String(body?.subdomain ?? '').toLowerCase();
  const email = String(body?.email ?? '');
  const locale = (String(body?.locale ?? 'fr') === 'en' ? 'en' : 'fr');

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ ok: false, error: 'INVALID_NAME' }, { status: 400 });
  }
  if (!subdomainRegex.test(subdomain) || reserved.has(subdomain)) {
    return NextResponse.json({ ok: false, error: 'INVALID_SUBDOMAIN' }, { status: 400 });
  }
  if (!email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'INVALID_EMAIL' }, { status: 400 });
  }

  // Disponibilité sous-domaine
  const { data: existing, error: rpcErr } = await supabaseAdmin.rpc('tenant_id_by_subdomain', { p_subdomain: subdomain });
  if (rpcErr) return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
  if (existing && (existing as unknown[]).length > 0) {
    return NextResponse.json({ ok: false, error: 'SUBDOMAIN_TAKEN' }, { status: 409 });
  }

  // Création tenant
  const { data: tenant, error: insErr } = await supabaseAdmin
    .from('tenants').insert({ name, subdomain, locale })
    .select('id, name, subdomain, locale').single();
  if (insErr || !tenant) return NextResponse.json({ ok: false, error: insErr?.message ?? 'INSERT_TENANT_FAILED' }, { status: 500 });

  // Rôle owner id
  const { data: roleRow, error: roleErr } = await supabaseAdmin.from('roles').select('id').eq('key', 'owner').single();
  if (roleErr || !roleRow) return NextResponse.json({ ok: false, error: roleErr?.message ?? 'ROLE_NOT_FOUND' }, { status: 500 });

  // Invitation / récupération user
  const redirectTo = redirectToUrl();
  const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
  let userId: string | null = invite.data?.user?.id ?? null;
  let inviteSent = !invite.error;

  if (!userId) {
    const listed = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (!listed.error && listed.data?.users) {
      const found = listed.data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (found) userId = found.id;
    }
  }
  if (!userId) {
    const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: false });
    if (created.error || !created.data?.user?.id) {
      return NextResponse.json({ ok: false, error: created.error?.message ?? 'USER_CREATE_FAILED' }, { status: 500 });
    }
    userId = created.data.user.id;
    inviteSent = false;
  }

  // Liens membership + rôle
  const m = await supabaseAdmin.from('user_tenants').insert({ user_id: userId, tenant_id: tenant.id, is_owner: true });
  if (m.error) return NextResponse.json({ ok: false, error: m.error.message, code: 'USER_TENANT_LINK_FAILED' }, { status: 500 });

  const r = await supabaseAdmin.from('user_roles').insert({ user_id: userId, tenant_id: tenant.id, role_id: roleRow.id });
  if (r.error) return NextResponse.json({ ok: false, error: r.error.message, code: 'USER_ROLE_LINK_FAILED' }, { status: 500 });

  const nextUrl = `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  return NextResponse.json({ ok: true, tenant, owner_email: email, invite_sent: inviteSent, next: nextUrl });
}
