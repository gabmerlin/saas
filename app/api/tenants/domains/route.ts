// app/api/tenants/domains/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Runtime Node pour pouvoir appeler des APIs externes proprement
export const runtime = 'nodejs';

/* --------------------------- types --------------------------- */

type Jsonish = Record<string, unknown>;
type ProvisionBody = {
  subdomain: string;
  tenantId?: string;     // optionnel si tu lies ici
  isPrimary?: boolean;   // défaut true
};

type AvailabilityOk =
  | { ok: true; available: true; fqdn: string }
  | { ok: true; available: false; fqdn: string; reason: string; source?: 'tenants' | 'tenant_domains' | 'vercel' };

type AvailabilityErr = { ok: false; error: string; code?: string };

/* --------------------------- consts --------------------------- */

const VERCEL_API = 'https://api.vercel.com';
const VERCEL_VERSION_ADD = 'v10';
const VERCEL_VERSION_GET = 'v9'; // liste/lookup
const OVH_ENDPOINT = process.env.OVH_API_ENDPOINT ?? 'https://eu.api.ovh.com/1.0';
const ROOT_ZONE = (process.env.PRIMARY_ZONE ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '').trim().toLowerCase();

const SUB_RE = /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/; // aligné sur ton CHECK SQL
const BAD = (m: string, code?: string) => NextResponse.json({ ok: false, error: m, code }, { status: 400 });

/* --------------------------- Supabase helpers --------------------------- */

function supabaseAnon(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function supabaseService(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/* --------------------------- routes --------------------------- */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sub = (url.searchParams.get('subdomain') ?? '').trim().toLowerCase();

  if (!sub) {
    // ping simple
    return NextResponse.json({ ok: true, hint: 'Use POST, or pass ?subdomain=xxx for availability' });
  }

  if (!SUB_RE.test(sub) || sub === 'www') {
    const fqdn = ROOT_ZONE ? `${sub}.${ROOT_ZONE}` : sub;
    const res: AvailabilityOk = { ok: true, available: false, fqdn, reason: 'invalid_subdomain' };
    return NextResponse.json(res);
  }

  if (!ROOT_ZONE) {
    const res: AvailabilityErr = { ok: false, error: 'PRIMARY_ZONE / NEXT_PUBLIC_ROOT_DOMAIN not set', code: 'root_zone_missing' };
    return NextResponse.json(res, { status: 500 });
  }

  const fqdn = `${sub}.${ROOT_ZONE}`;

  // 0) Vérif DB (si les RPC existent, sinon on ignore proprement)
  try {
    const sb = supabaseAnon();
    const subExists = await sb.rpc('subdomain_exists', { p_subdomain: sub });
    if (!subExists.error && subExists.data === true) {
      const res: AvailabilityOk = { ok: true, available: false, fqdn, reason: 'already_in_db', source: 'tenants' };
      return NextResponse.json(res);
    }
    const domExists = await sb.rpc('domain_exists', { p_domain: fqdn });
    if (!domExists.error && domExists.data === true) {
      const res: AvailabilityOk = { ok: true, available: false, fqdn, reason: 'already_in_db', source: 'tenant_domains' };
      return NextResponse.json(res);
    }
    // si RPC absentes => subExists.error/domExists.error, on laisse continuer (pas bloquant)
  } catch {
    // ignore : fallback Vercel
  }

  // 1) Vérif côté Vercel (source de vérité du routing)
  try {
    const exists = await vercelDomainExists(fqdn);
    if (exists) {
      const res: AvailabilityOk = { ok: true, available: false, fqdn, reason: 'vercel_domain_exists', source: 'vercel' };
      return NextResponse.json(res);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const res: AvailabilityErr = { ok: false, error: `Vercel check failed: ${msg}`, code: 'vercel_check_failed' };
    return NextResponse.json(res, { status: 500 });
  }

  const res: AvailabilityOk = { ok: true, available: true, fqdn };
  return NextResponse.json(res);
}

export async function POST(req: NextRequest) {
  try {
    // Auth interne
    const secret = req.headers.get('x-provisioning-secret') ?? '';
    if (!secret || secret !== (process.env.DOMAIN_PROVISIONING_SECRET ?? '')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: missing/invalid x-provisioning-secret', code: 'unauthorized' }, { status: 401 });
    }

    if (!ROOT_ZONE) return NextResponse.json({ ok: false, error: 'PRIMARY_ZONE / NEXT_PUBLIC_ROOT_DOMAIN not set', code: 'root_zone_missing' }, { status: 500 });

    const body = (await req.json().catch(() => ({}))) as ProvisionBody;
    const sub = (body.subdomain || '').trim().toLowerCase();
    if (!SUB_RE.test(sub) || sub === 'www') return BAD('Invalid subdomain', 'invalid_subdomain');

    const fqdn = `${sub}.${ROOT_ZONE}`;

    // 0) Double-check DB avant Vercel
    try {
      const sb = supabaseAnon();
      const s1 = await sb.rpc('subdomain_exists', { p_subdomain: sub });
      if (!s1.error && s1.data === true) {
        return NextResponse.json({ ok: false, error: `Subdomain taken: ${sub}`, code: 'subdomain_exists' }, { status: 409 });
      }
      const s2 = await sb.rpc('domain_exists', { p_domain: fqdn });
      if (!s2.error && s2.data === true) {
        return NextResponse.json({ ok: false, error: `Domain taken: ${fqdn}`, code: 'domain_exists' }, { status: 409 });
      }
    } catch {
      // si RPC absentes, on continue
    }

    // 1) Ajout du domaine sur le projet Vercel
    const { VERCEL_PROJECT_ID, VERCEL_TOKEN } = process.env;
    if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) {
      return NextResponse.json({ ok: false, error: 'VERCEL_PROJECT_ID / VERCEL_TOKEN not set', code: 'vercel_env_missing' }, { status: 500 });
    }

    // Check si déjà présent (plus rapide que POST direct)
    const already = await vercelDomainExists(fqdn).catch(() => false);
    if (already) {
      return NextResponse.json({ ok: false, error: `Domain already exists on project: ${fqdn}`, code: 'domain_exists' }, { status: 409 });
    }

    const vAdd = await fetch(
      `${VERCEL_API}/${VERCEL_VERSION_ADD}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: fqdn }),
      },
    );

    if (!vAdd.ok) {
      if (vAdd.status === 409) {
        const e = (await vAdd.json().catch(() => ({}))) as Jsonish;
        const code = (e?.error as Jsonish)?.code;
        const pid = (e?.error as Jsonish)?.projectId;
        if (code === 'domain_already_in_use' && pid === process.env.VERCEL_PROJECT_ID) {
          return NextResponse.json({ ok: false, error: `Domain already exists on project: ${fqdn}`, code: 'domain_exists' }, { status: 409 });
        }
        return NextResponse.json({ ok: false, error: `Vercel add domain failed: ${vAdd.status} ${JSON.stringify(e)}`, code: 'vercel_add_failed' }, { status: 400 });
      }
      const e = await vAdd.text();
      return NextResponse.json({ ok: false, error: `Vercel add domain failed: ${vAdd.status} ${e}`, code: 'vercel_add_failed' }, { status: 400 });
    }

    // 2) Créer/MàJ CNAME côté OVH (si pas full wildcard)
    try {
      const existingIds = await ovhListRecordsBySub('CNAME', sub);

      let hasGoodCname = false;
      for (const id of existingIds) {
        const rec = await ovhGetRecord(id);
        if (rec.fieldType !== 'CNAME') {
          await ovhDeleteRecord(id);
          continue;
        }
        if (!isGoodTarget(rec.target)) {
          await ovhUpdateRecord(id, { target: 'cname.vercel-dns.com.', ttl: 60 });
        } else {
          hasGoodCname = true;
        }
      }

      if (!hasGoodCname && existingIds.length === 0) {
        await ovhCreateRecord({
          fieldType: 'CNAME',
          subDomain: sub,
          target: 'cname.vercel-dns.com.',
          ttl: 60,
        });
      }

      await ovhRefreshZone();
    } catch {
      // Si wildcard Vercel actif, l'échec OVH n'est pas bloquant : on ignore.
    }

    // 3) (Optionnel) Insérer en DB le tenant_domains primaire ici si tu le souhaites :
    // if (body.tenantId) {
    //   const svc = supabaseService();
    //   const { error } = await svc.from('tenant_domains').insert({
    //     tenant_id: body.tenantId,
    //     domain: fqdn,
    //     is_primary: body.isPrimary ?? true,
    //   });
    //   if (error) {
    //     // 23505 → déjà en base
    //     const pg = (error as any)?.code ?? '';
    //     if (pg === '23505' || String(error.message).toLowerCase().includes('duplicate key')) {
    //       return NextResponse.json({ ok: false, error: 'Domain already in DB', code: 'domain_exists' }, { status: 409 });
    //     }
    //     return NextResponse.json({ ok: false, error: `DB insert failed: ${error.message}`, code: 'db_insert_failed' }, { status: 500 });
    //   }
    // }

    return NextResponse.json({ ok: true, domain: fqdn });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: `Server error: ${msg}`, code: 'server_error' }, { status: 500 });
  }
}

/* --------------------------- helpers --------------------------- */

function isGoodTarget(target: string): boolean {
  const t = target.trim().toLowerCase();
  return t === 'cname.vercel-dns.com' || t === 'cname.vercel-dns.com.';
}

/* --------------------------- Vercel helpers --------------------------- */

async function vercelDomainExists(fqdn: string): Promise<boolean> {
  const { VERCEL_PROJECT_ID, VERCEL_TOKEN } = process.env;
  if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) {
    throw new Error('VERCEL_PROJECT_ID / VERCEL_TOKEN not set');
  }
  // Lookup direct
  const getOne = await fetch(
    `${VERCEL_API}/${VERCEL_VERSION_GET}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(
      fqdn,
    )}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' },
  );
  if (getOne.status === 200) return true;
  if (getOne.status === 404) return false;

  // Fallback (précaution)
  const r = await fetch(
    `${VERCEL_API}/${VERCEL_VERSION_GET}/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' },
  );
  if (!r.ok) throw new Error(`Vercel list domains failed: ${r.status}`);
  const data = (await r.json()) as { domains?: Array<{ name: string }> };
  return (data.domains ?? []).some((d) => d.name === fqdn);
}

/* --------------------------- OVH client --------------------------- */

type OvhRecord = {
  id: number;
  fieldType: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'SRV' | string;
  subDomain: string;
  target: string;
  ttl: number;
  zone: string;
};

type OvhCreateBody = {
  fieldType: 'CNAME';
  subDomain: string;
  target: string;
  ttl: number;
};

type OvhUpdateBody = {
  target?: string;
  ttl?: number;
};

function ovhClientFromEnv() {
  const AK = process.env.OVH_APP_KEY ?? '';
  const AS = process.env.OVH_APP_SECRET ?? '';
  const CK = process.env.OVH_CONSUMER_KEY ?? '';
  if (!AK || !AS || !CK) {
    throw new Error('OVH_APP_KEY / OVH_APP_SECRET / OVH_CONSUMER_KEY not set');
  }
  return { AK, AS, CK };
}

async function ovhTime(): Promise<number> {
  const r = await fetch(`${OVH_ENDPOINT}/auth/time`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`OVH time failed: ${r.status}`);
  return r.json();
}

async function ovhSignedFetch(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  bodyObj?: Jsonish | string,
) {
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
    body: body ? body : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OVH ${method} ${path} -> ${res.status} ${text}`);
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  return null;
}

async function ovhListRecordsBySub(fieldType: 'CNAME', subDomain: string): Promise<number[]> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record?fieldType=${fieldType}&subDomain=${encodeURIComponent(
    subDomain,
  )}`;
  const ids = (await ovhSignedFetch('GET', path)) as number[];
  return Array.isArray(ids) ? ids : [];
}

async function ovhGetRecord(id: number): Promise<OvhRecord> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`;
  return (await ovhSignedFetch('GET', path)) as OvhRecord;
}

async function ovhDeleteRecord(id: number): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`;
  await ovhSignedFetch('DELETE', path);
}

async function ovhUpdateRecord(id: number, body: OvhUpdateBody): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`;
  await ovhSignedFetch('PUT', path, body);
}

async function ovhCreateRecord(body: OvhCreateBody): Promise<number> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record`;
  const id = (await ovhSignedFetch('POST', path, body)) as number;
  return id;
}

async function ovhRefreshZone(): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/refresh`;
  await ovhSignedFetch('POST', path, {});
}
