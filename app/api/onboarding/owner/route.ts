import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ownerOnboardingSchema, reservedSubdomains } from '@/lib/validators';

type Json = Record<string, unknown>;

// Util: normalise APP_BASE_URL pour redirectTo
function redirectToUrl(): string {
  const base = (process.env.APP_BASE_URL ?? '').replace(/\/+$/, '');
  return base ? `${base}/auth/callback` : 'http://localhost:3000/auth/callback';
}

export async function POST(req: NextRequest) {
  // 1) Parse & validate
  const body = (await req.json().catch(() => ({}))) as Json;
  const parse = ownerOnboardingSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { ok: false, error: parse.error.format() },
      { status: 400 }
    );
  }
  const { name, subdomain, email, locale } = parse.data;

  if (reservedSubdomains.has(subdomain)) {
    return NextResponse.json(
      { ok: false, error: 'RESERVED_SUBDOMAIN' },
      { status: 400 }
    );
  }

  // 2) Subdomain availability
  const { data: existing, error: rpcErr } = await supabaseAdmin
    .rpc('tenant_id_by_subdomain', { p_subdomain: subdomain });
  if (rpcErr) {
    return NextResponse.json({ ok: false, error: rpcErr.message }, { status: 500 });
  }
  if (existing && (existing as unknown[]).length > 0) {
    return NextResponse.json({ ok: false, error: 'SUBDOMAIN_TAKEN' }, { status: 409 });
  }

  // 3) Create tenant
  const { data: tenant, error: insErr } = await supabaseAdmin
    .from('tenants')
    .insert({ name, subdomain, locale })
    .select('id, name, subdomain, locale')
    .single();

  if (insErr || !tenant) {
    return NextResponse.json(
      { ok: false, error: insErr?.message ?? 'INSERT_TENANT_FAILED' },
      { status: 500 }
    );
  }

  // 4) Get owner role id
  const { data: roleRow, error: roleErr } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('key', 'owner')
    .single();

  if (roleErr || !roleRow) {
    return NextResponse.json({ ok: false, error: roleErr?.message ?? 'ROLE_NOT_FOUND' }, { status: 500 });
  }

  // 5) Invite/create user and get user_id
  const redirectTo = redirectToUrl();

  // Essai 1: invite email (envoi d'email par Supabase)
  const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
  let userId: string | null = invite.data?.user?.id ?? null;
  let inviteSent = !invite.error;

  // Si l'utilisateur existe déjà (ou invite bloquée), on tente de le retrouver par email
  // Si l'utilisateur existe déjà (ou invite bloquée), on tente de retrouver via listUsers
    if (!userId) {
    const listed = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (!listed.error && listed.data?.users) {
        const found = listed.data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
        userId = found.id;
        }
    }
    }


  if (!userId) {
    // Dernier recours: création directe (sans email confirmé)
    const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: false });
    if (created.error || !created.data?.user?.id) {
      return NextResponse.json(
        { ok: false, error: created.error?.message ?? 'USER_CREATE_FAILED' },
        { status: 500 }
      );
    }
    userId = created.data.user.id;
    inviteSent = false;
  }

  // 6) Link memberships & roles
  const insMembership = await supabaseAdmin.from('user_tenants').insert({
    user_id: userId,
    tenant_id: tenant.id,
    is_owner: true
  });

  if (insMembership.error) {
    return NextResponse.json(
      { ok: false, error: insMembership.error.message, code: 'USER_TENANT_LINK_FAILED' },
      { status: 500 }
    );
  }

  const insRole = await supabaseAdmin.from('user_roles').insert({
    user_id: userId,
    tenant_id: tenant.id,
    role_id: roleRow.id
  });

  if (insRole.error) {
    return NextResponse.json(
      { ok: false, error: insRole.error.message, code: 'USER_ROLE_LINK_FAILED' },
      { status: 500 }
    );
  }

  // 7) Next URL to open
  const nextUrl = `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;

  return NextResponse.json({
    ok: true,
    tenant,
    owner_email: email,
    invite_sent: inviteSent,
    next: nextUrl
  });
}
