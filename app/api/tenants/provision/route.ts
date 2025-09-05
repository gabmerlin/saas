// app/api/tenants/provision/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

type Body = {
  subdomain: string;
  tenantName?: string;
  ownerEmail?: string;
  locale?: 'fr' | 'en';
  makePrimary?: boolean;
};

const SUB_RE = /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/;

function svc(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/* ===== OVH Email redirection helpers (inchangés) ===== */
const OVH_ENDPOINT = process.env.OVH_API_ENDPOINT ?? 'https://eu.api.ovh.com/1.0';
function ovhClientFromEnv() {
  const AK = process.env.OVH_APP_KEY ?? '';
  const AS = process.env.OVH_APP_SECRET ?? '';
  const CK = process.env.OVH_CONSUMER_KEY ?? '';
  if (!AK || !AS || !CK) throw new Error('OVH_APP_KEY / OVH_APP_SECRET / OVH_CONSUMER_KEY not set');
  return { AK, AS, CK };
}
async function ovhTime(): Promise<number> {
  const r = await fetch(`${OVH_ENDPOINT}/auth/time`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`OVH time failed: ${r.status}`);
  return r.json();
}
async function ovhSignedFetch(method: 'GET'|'POST'|'PUT'|'DELETE', path: string, bodyObj?: Record<string, unknown> | string) {
  const { AK, AS, CK } = ovhClientFromEnv();
  const url = `${OVH_ENDPOINT}${path}`;
  const time = await ovhTime();
  const body = typeof bodyObj === 'string' ? bodyObj : bodyObj ? JSON.stringify(bodyObj) : '';
  const toSign = `${AS}+${CK}+${method}+${url}+${body}+${time}`;
  const sig = '$1$' + createHash('sha1').update(Buffer.from(toSign, 'utf8')).digest('hex');

  const res = await fetch(url, {
    method,
    headers: {
      'X-Ovh-Application': AK,
      'X-Ovh-Consumer': CK,
      'X-Ovh-Timestamp': String(time),
      'X-Ovh-Signature': sig,
      'Content-Type': 'application/json',
    },
    body: body || undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OVH ${method} ${path} -> ${res.status} ${t}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return res.json();
  return null;
}
async function ovhFindRedirectionIdByFrom(mailDomain: string, fromAddr: string): Promise<number | null> {
  const ids = (await ovhSignedFetch(
    'GET',
    `/email/domain/${encodeURIComponent(mailDomain)}/redirection?from=${encodeURIComponent(fromAddr)}`,
  )) as number[] | null;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return null;
  return ids[0];
}
type OvhRedirection = { id: number; from: string; to: string; localCopy: boolean };
async function ovhGetRedirection(mailDomain: string, id: number): Promise<OvhRedirection> {
  return (await ovhSignedFetch('GET', `/email/domain/${encodeURIComponent(mailDomain)}/redirection/${id}`)) as OvhRedirection;
}
async function ovhCreateRedirection(mailDomain: string, fromAddr: string, toAddr: string, localCopy: boolean): Promise<number> {
  const id = (await ovhSignedFetch('POST', `/email/domain/${encodeURIComponent(mailDomain)}/redirection`, {
    from: fromAddr,
    to: toAddr,
    localCopy,
  })) as number;
  return id;
}
async function ovhUpdateRedirection(mailDomain: string, id: number, toAddr: string, localCopy: boolean): Promise<void> {
  await ovhSignedFetch('PUT', `/email/domain/${encodeURIComponent(mailDomain)}/redirection/${id}`, {
    to: toAddr,
    localCopy,
  });
}

/* ===== utils ===== */
async function findUserIdByEmail(sb: SupabaseClient, email: string): Promise<string | null> {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.DOMAIN_PROVISIONING_SECRET;
    if (!secret) {
      return NextResponse.json({ ok: false, code: 'server_misconfig', error: 'DOMAIN_PROVISIONING_SECRET not set' }, { status: 500 });
    }

    const { subdomain, tenantName, ownerEmail, locale = 'fr', makePrimary = true } =
      (await req.json().catch(() => ({}))) as Body;

    const sub = (subdomain ?? '').trim().toLowerCase();
    if (!SUB_RE.test(sub) || sub === 'www') {
      return NextResponse.json({ ok: false, code: 'invalid_subdomain', error: 'Invalid subdomain' }, { status: 400 });
    }
    if (!tenantName || tenantName.trim().length < 2) {
      return NextResponse.json({ ok: false, code: 'invalid_tenant_name', error: 'tenantName is required' }, { status: 400 });
    }
    if (!ownerEmail) {
      return NextResponse.json({ ok: false, code: 'invalid_owner_email', error: 'ownerEmail is required' }, { status: 400 });
    }

    const ROOT_ZONE = (process.env.PRIMARY_ZONE ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').trim().toLowerCase();
    if (!ROOT_ZONE) {
      return NextResponse.json({ ok: false, code: 'root_zone_missing', error: 'PRIMARY_ZONE / NEXT_PUBLIC_ROOT_DOMAIN not set' }, { status: 500 });
    }
    const MAIL_DOMAIN = (process.env.MAIL_DOMAIN ?? ROOT_ZONE).trim().toLowerCase();
    const ALIAS_LOCAL_COPY = String(process.env.EMAIL_ALIAS_LOCAL_COPY ?? 'false').toLowerCase() === 'true';

    const fqdn = `${sub}.${ROOT_ZONE}`;
    const sb = svc();

    // Anti-doublon DB (RPC si présentes)
    try {
      const { data } = await sb.rpc('subdomain_exists', { p_subdomain: sub });
      if (data === true) {
        return NextResponse.json({ ok: false, code: 'subdomain_exists', error: `Subdomain taken: ${sub}` }, { status: 409 });
      }
    } catch {}
    try {
      const { data } = await sb.rpc('domain_exists', { p_domain: fqdn });
      if (data === true) {
        return NextResponse.json({ ok: false, code: 'domain_exists', error: `Domain taken: ${fqdn}` }, { status: 409 });
      }
    } catch {}

    // Owner user
    let ownerId = await findUserIdByEmail(sb, ownerEmail).catch(() => null);
    if (!ownerId) {
      const inv = await sb.auth.admin.inviteUserByEmail(ownerEmail, {
        redirectTo: `${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/${locale}`,
      });
      if (inv.error) {
        const cu = await sb.auth.admin.createUser({ email: ownerEmail, email_confirm: false });
        if (cu.error) return NextResponse.json({ ok: false, code: 'owner_create_failed', error: cu.error.message }, { status: 500 });
        ownerId = cu.data.user?.id ?? null;
      } else {
        ownerId = inv.data.user?.id ?? null;
      }
    }
    if (!ownerId) return NextResponse.json({ ok: false, code: 'owner_missing', error: 'Failed to get/create owner user' }, { status: 500 });

    // Tenant
    const insTenant = await sb.from('tenants').insert({ name: tenantName, subdomain: sub, locale }).select('id').single();
    if (insTenant.error) {
      const pg = (insTenant.error as PostgrestError).code ?? '';
      if (pg === '23505' || String(insTenant.error.message).toLowerCase().includes('duplicate')) {
        return NextResponse.json({ ok: false, code: 'subdomain_exists', error: `Subdomain taken: ${sub}` }, { status: 409 });
      }
      return NextResponse.json({ ok: false, code: 'tenant_insert_failed', error: insTenant.error.message }, { status: 500 });
    }
    const tenantId = insTenant.data.id as string;

    // Liaisons
    const insUT = await sb.from('user_tenants').insert({ user_id: ownerId, tenant_id: tenantId, is_owner: true });
    if (insUT.error) return NextResponse.json({ ok: false, code: 'user_tenants_insert_failed', error: insUT.error.message }, { status: 500 });

    const roleOwner = await sb.from('roles').select('id').eq('key', 'owner').single();
    if (roleOwner.error || !roleOwner.data?.id) return NextResponse.json({ ok: false, code: 'role_owner_missing', error: 'Role owner not found' }, { status: 500 });

    const insUR = await sb.from('user_roles').insert({ user_id: ownerId, tenant_id: tenantId, role_id: roleOwner.data.id });
    if (insUR.error) return NextResponse.json({ ok: false, code: 'user_roles_insert_failed', error: insUR.error.message }, { status: 500 });

    // Domaine primaire (DB)
    const insDomain = await sb.from('tenant_domains').insert({ tenant_id: tenantId, domain: fqdn, is_primary: makePrimary }).select('id, domain').single();
    if (insDomain.error) {
      const pg = (insDomain.error as PostgrestError).code ?? '';
      if (pg === '23505' || String(insDomain.error.message).toLowerCase().includes('duplicate')) {
        return NextResponse.json({ ok: false, code: 'domain_exists', error: `Domain taken: ${fqdn}` }, { status: 409 });
      }
      return NextResponse.json({ ok: false, code: 'domain_insert_failed', error: insDomain.error.message }, { status: 500 });
    }

    // DNS (Vercel/OVH) — accepte 200 OK ou 409 Conflict (déjà existant)
    const dnsRes = await fetch(new URL('/api/tenants/domains', req.nextUrl).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-provisioning-secret': secret },
      body: JSON.stringify({ subdomain: sub }),
    });

    if (!(dnsRes.ok || dnsRes.status === 409)) {
      const err = await dnsRes.text().catch(() => '');
      return NextResponse.json({ ok: false, code: 'dns_provision_failed', error: err || 'DNS provision failed', tenantId, fqdn }, { status: dnsRes.status });
    }

    // Alias mail sub@MAIL_DOMAIN -> ownerEmail (best-effort)
    const aliasLocal = sub;
    const aliasEmail = `${aliasLocal}@${MAIL_DOMAIN}`;
    try {
      const redirId = await ovhFindRedirectionIdByFrom(MAIL_DOMAIN, aliasEmail);
      if (redirId) {
        const cur = await ovhGetRedirection(MAIL_DOMAIN, redirId);
        if (cur.to.toLowerCase() !== ownerEmail.toLowerCase() || cur.localCopy !== ALIAS_LOCAL_COPY) {
          await ovhUpdateRedirection(MAIL_DOMAIN, redirId, ownerEmail, ALIAS_LOCAL_COPY);
        }
        await sb.from('tenant_email_aliases')
          .upsert({ tenant_id: tenantId, alias_local: aliasLocal, alias_email: aliasEmail, forward_to: ownerEmail, ovh_redirection_id: redirId, status: 'active' }, { onConflict: 'tenant_id,alias_email' });
      } else {
        const newId = await ovhCreateRedirection(MAIL_DOMAIN, aliasEmail, ownerEmail, ALIAS_LOCAL_COPY);
        await sb.from('tenant_email_aliases')
          .insert({ tenant_id: tenantId, alias_local: aliasLocal, alias_email: aliasEmail, forward_to: ownerEmail, ovh_redirection_id: newId, status: 'active' });
      }
    } catch {
      await sb.from('tenant_email_aliases')
        .upsert({ tenant_id: tenantId, alias_local: aliasLocal, alias_email: aliasEmail, forward_to: ownerEmail, status: 'error' }, { onConflict: 'tenant_id,alias_email' });
    }

    return NextResponse.json({ ok: true, tenantId, ownerId, domain: fqdn, alias: aliasEmail });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, code: 'server_error', error: msg }, { status: 500 });
  }
}
