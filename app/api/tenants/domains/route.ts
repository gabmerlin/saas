// app/api/tenants/domains/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type Jsonish = Record<string, unknown>;
type ProvisionBody = { subdomain?: string };

// --- ENV & Constantes
const VERCEL_API = 'https://api.vercel.com';
const VERCEL_VERSION_ADD = 'v10';
const VERCEL_VERSION_GET = 'v9';
const OVH_ENDPOINT = process.env.OVH_API_ENDPOINT ?? 'https://eu.api.ovh.com/1.0';
const ROOT_ZONE = (process.env.PRIMARY_ZONE ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').trim().toLowerCase();
const SUB_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// ⚑ Feature flag: alias email désactivé par défaut
const EMAIL_ALIAS_AUTOMATE = (process.env.EMAIL_ALIAS_AUTOMATE ?? 'false').toLowerCase() === 'true';
const EMAIL_ALIAS_DOMAIN = process.env.EMAIL_ALIAS_DOMAIN || ROOT_ZONE;
const EMAIL_ALIAS_ACCOUNT = (process.env.EMAIL_ALIAS_ACCOUNT ?? '').trim();

// ---------- utils ----------
function jsonError(code: number, message: string, extra?: Jsonish) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: code });
}
function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function parseBody(req: NextRequest): Promise<ProvisionBody> {
  const ct = (req.headers.get('content-type') ?? '').toLowerCase();
  try {
    if (ct.includes('application/json')) return (await req.json()) as ProvisionBody;
    const raw = await req.text();
    try {
      return JSON.parse(raw) as ProvisionBody;
    } catch {
      const p = new URLSearchParams(raw);
      return { subdomain: p.get('subdomain') ?? undefined };
    }
  } catch {
    return {};
  }
}

// ---------- Vercel helpers ----------
async function vercelDomainExists(fqdn: string): Promise<boolean> {
  const { VERCEL_PROJECT_ID, VERCEL_TOKEN } = process.env;
  if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) throw new Error('VERCEL_PROJECT_ID / VERCEL_TOKEN not set');

  const r1 = await fetch(
    `${VERCEL_API}/${VERCEL_VERSION_GET}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(
      fqdn,
    )}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' },
  );
  if (r1.status === 200) return true;
  if (r1.status === 404) return false;

  const r2 = await fetch(
    `${VERCEL_API}/${VERCEL_VERSION_GET}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' },
  );
  if (!r2.ok) throw new Error(`Vercel list domains failed: ${r2.status}`);
  const data = (await r2.json()) as { domains?: Array<{ name: string }> };
  return (data.domains ?? []).some((d) => d.name === fqdn);
}

// ---------- OVH signing (DNS + Email, même logique) ----------
type OVHKind = 'dns' | 'email';
function ovhCreds(kind: OVHKind) {
  const AK = process.env.OVH_APP_KEY ?? '';
  const AS = process.env.OVH_APP_SECRET ?? '';
  const CK =
    (kind === 'dns'
      ? process.env.OVH_CONSUMER_KEY_DNS ?? process.env.OVH_CONSUMER_KEY
      : process.env.OVH_CONSUMER_KEY_EMAIL ?? process.env.OVH_CONSUMER_KEY) ?? '';
  if (!AK || !AS || !CK) throw new Error(`OVH creds missing for ${kind}`);
  return { AK, AS, CK };
}
async function ovhTime(): Promise<number> {
  const r = await fetch(`${OVH_ENDPOINT}/auth/time`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`OVH time failed: ${r.status}`);
  return r.json();
}
async function ovhSignedFetch(kind: OVHKind, method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, bodyObj?: unknown) {
  const { AK, AS, CK } = ovhCreds(kind);
  const url = `${OVH_ENDPOINT}${path}`;
  const time = await ovhTime();
  const body = bodyObj ? JSON.stringify(bodyObj) : '';
  const sig =
    '$1$' + createHash('sha1').update(Buffer.from(`${AS}+${CK}+${method}+${url}+${body}+${time}`, 'utf8')).digest('hex');
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

  const text = await res.text();
  if (!res.ok) throw new Error(`OVH ${method} ${path} -> ${res.status} ${text}`);
  const ct = res.headers.get('content-type') ?? '';
  return ct.includes('application/json') ? JSON.parse(text) : text;
}

// ---------- OVH DNS ----------
type OvhRecord = { id: number; fieldType: string; subDomain: string; target: string; ttl: number; zone: string };
async function ovhListRecordsBySub(sub: string): Promise<number[]> {
  const path = `/domain/zone/${encodeURIComponent(
    ROOT_ZONE,
  )}/record?fieldType=CNAME&subDomain=${encodeURIComponent(sub)}`;
  const ids = (await ovhSignedFetch('dns', 'GET', path)) as number[];
  return Array.isArray(ids) ? ids : [];
}
async function ovhGetRecord(id: number): Promise<OvhRecord> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`;
  return (await ovhSignedFetch('dns', 'GET', path)) as OvhRecord;
}
async function ovhDeleteRecord(id: number): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`;
  await ovhSignedFetch('dns', 'DELETE', path);
}
async function ovhUpdateRecord(id: number, target: string): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`;
  await ovhSignedFetch('dns', 'PUT', path, { target, ttl: 60 });
}
async function ovhCreateRecord(sub: string, target: string): Promise<number> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record`;
  return (await ovhSignedFetch('dns', 'POST', path, {
    fieldType: 'CNAME',
    subDomain: sub,
    target,
    ttl: 60,
  })) as number;
}
async function ovhRefreshZone(): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/refresh`;
  await ovhSignedFetch('dns', 'POST', path, {});
}
function isGoodTarget(t: string) {
  const s = t.trim().toLowerCase();
  return s === 'cname.vercel-dns.com' || s === 'cname.vercel-dns.com.';
}

// ---------- OVH Email (alias) ----------
async function ovhCreateEmailAlias(localPart: string): Promise<void> {
  // Si l’alias est désactivé -> ne rien faire (pas de side-effect)
  if (!EMAIL_ALIAS_AUTOMATE) return;

  const domain = EMAIL_ALIAS_DOMAIN;
  const account = EMAIL_ALIAS_ACCOUNT;
  if (!domain || !account) return;
  if (!SUB_RE.test(localPart) || localPart === 'www') return;

  const path = `/email/domain/${encodeURIComponent(domain)}/account/${encodeURIComponent(account)}/alias`;
  await ovhSignedFetch('email', 'POST', path, { alias: localPart });
}

// -------------------------- ROUTES --------------------------

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sub = (url.searchParams.get('subdomain') ?? '').trim().toLowerCase();
  if (!sub) return NextResponse.json({ ok: true, hint: 'Use POST, or pass ?subdomain=xxx for availability' });
  if (!SUB_RE.test(sub) || sub === 'www') {
    const fqdn = ROOT_ZONE ? `${sub}.${ROOT_ZONE}` : sub;
    return NextResponse.json({ ok: true, available: false, fqdn, reason: 'invalid_subdomain' });
  }
  if (!ROOT_ZONE) return jsonError(500, 'PRIMARY_ZONE / ROOT_DOMAIN not set', { code: 'root_zone_missing' });

  const fqdn = `${sub}.${ROOT_ZONE}`;

  // Optionnel: on consulte la BDD pour éviter les doublons logiques
  try {
    const sb = supabaseAnon();
    const { data: s1 } = await sb.rpc('subdomain_exists', { p_subdomain: sub });
    if (s1 === true)
      return NextResponse.json({ ok: true, available: false, fqdn, reason: 'already_in_db', source: 'tenants' });
    const { data: s2 } = await sb.rpc('domain_exists', { p_domain: fqdn });
    if (s2 === true)
      return NextResponse.json({ ok: true, available: false, fqdn, reason: 'already_in_db', source: 'tenant_domains' });
  } catch {
    // ignore
  }

  try {
    const exists = await vercelDomainExists(fqdn);
    if (exists)
      return NextResponse.json({ ok: true, available: false, fqdn, reason: 'vercel_domain_exists', source: 'vercel' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `Vercel check failed: ${msg}`, { code: 'vercel_check_failed' });
  }

  return NextResponse.json({ ok: true, available: true, fqdn });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const DEBUG = url.searchParams.get('debug') === '1' || (req.headers.get('x-debug') ?? '') === '1';

  try {
    const secret = req.headers.get('x-provisioning-secret') ?? '';
    if (!secret || secret !== (process.env.DOMAIN_PROVISIONING_SECRET ?? '')) {
      return jsonError(401, 'Unauthorized: missing/invalid x-provisioning-secret', { code: 'unauthorized' });
    }
    if (!ROOT_ZONE) return jsonError(500, 'PRIMARY_ZONE / ROOT_DOMAIN not set', { code: 'root_zone_missing' });

    const raw = await parseBody(req);
    const sub = (raw.subdomain ?? '').trim().toLowerCase();
    if (!sub) return jsonError(400, 'Missing subdomain', { code: 'missing_subdomain' });
    if (!SUB_RE.test(sub) || sub === 'www') return jsonError(400, 'Invalid subdomain', { code: 'invalid_subdomain' });

    const fqdn = `${sub}.${ROOT_ZONE}`;
    const { VERCEL_PROJECT_ID, VERCEL_TOKEN } = process.env;
    if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) {
      return jsonError(500, 'VERCEL_PROJECT_ID / VERCEL_TOKEN not set', { code: 'vercel_env_missing' });
    }

    // 1) Vercel: ajout du domain (idempotent)
    let existed = await vercelDomainExists(fqdn).catch(() => false);
    if (!existed) {
      const vAdd = await fetch(
        `${VERCEL_API}/${VERCEL_VERSION_ADD}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'content-type': 'application/json' },
          body: JSON.stringify({ name: fqdn }),
        },
      );
      if (!vAdd.ok && vAdd.status !== 409) {
        const errTxt = await vAdd.text();
        return jsonError(400, `Vercel add domain failed: ${vAdd.status} ${errTxt}`, { code: 'vercel_add_failed' });
      }
      existed = vAdd.status === 409 ? true : existed;
    }

    // 2) OVH DNS CNAME (on tente; wildcard Vercel couvrira si échec)
    try {
      const ids = await ovhListRecordsBySub(sub);
      let good = false;
      for (const id of ids) {
        const rec = await ovhGetRecord(id);
        if (rec.fieldType !== 'CNAME') {
          await ovhDeleteRecord(id);
          continue;
        }
        if (!isGoodTarget(rec.target)) {
          await ovhUpdateRecord(id, 'cname.vercel-dns.com.');
        } else {
          good = true;
        }
      }
      if (!good && ids.length === 0) await ovhCreateRecord(sub, 'cname.vercel-dns.com.');
      await ovhRefreshZone();
    } catch (e) {
      if (DEBUG) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(502, `OVH DNS failed: ${msg}`, { code: 'ovh_dns_failed' });
      }
      // sinon: on ignore (wildcard Vercel)
    }

    // 3) Alias Email — **désactivé** si EMAIL_ALIAS_AUTOMATE != true
    try {
      await ovhCreateEmailAlias(sub);
    } catch (e) {
      if (DEBUG) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonError(200, `OVH Email alias skipped/failed: ${msg}`, { code: 'ovh_email_failed', ok: true, domain: fqdn, existed });
      }
      // en prod: silencieux
    }

    return NextResponse.json({ ok: true, domain: fqdn, existed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(500, `Server error: ${msg}`, { code: 'server_error' });
  }
}
