import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- utils ----------
type Json = Record<string, unknown>;

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function json(status: number, data: unknown) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// ---------- validation ----------
const SUBDOMAIN = z
  .string()
  .trim()
  .min(1, "subdomain required")
  .max(63)
  .regex(/^(?!-)[a-z0-9-]+(?<!-)$/i, "invalid subdomain");

const RESERVED = new Set(["www", "api", "cdn", "static"]);

// ---------- vercel ----------
async function vercelAddDomain(projectId: string, token: string, fqdn: string): Promise<unknown> {
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: fqdn }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel add-domain failed: ${res.status} ${text}`);
  return text ? (JSON.parse(text) as unknown) : {};
}

async function vercelVerifyDomain(projectId: string, token: string, fqdn: string): Promise<unknown> {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(fqdn)}/verify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel verify failed: ${res.status} ${text}`);
  return text ? (JSON.parse(text) as unknown) : {};
}

// ---------- OVH signé ----------
type OvhRecord = {
  id: number;
  fieldType: string;
  subDomain?: string;
  target?: string;
  ttl?: number;
  zone?: string;
};

async function ovhSigned(
  endpoint: string,
  appKey: string,
  appSecret: string,
  consumerKey: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  bodyObj?: Record<string, unknown>
): Promise<unknown> {
  const url = `${endpoint}${path}`;
  const body = bodyObj ? JSON.stringify(bodyObj) : "";

  const tRes = await fetch(`${endpoint}/auth/time`);
  const t = await tRes.text();
  const timestamp = parseInt(t, 10);

  const toSign = `${appSecret}+${consumerKey}+${method}+${url}+${body}+${timestamp}`;
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  const signature = `$1$${hex}`;

  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": appKey,
      "X-Ovh-Consumer": consumerKey,
      "X-Ovh-Timestamp": String(timestamp),
      "X-Ovh-Signature": signature,
      "content-type": "application/json",
    },
    body: body || undefined,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`OVH ${method} ${path} -> ${res.status} ${text}`);
  return text ? (JSON.parse(text) as unknown) : {};
}

// helpers OVH
async function ovhListRecordIds(endpoint: string, ak: string, as: string, ck: string, zone: string, query: string): Promise<number[]> {
  const out = await ovhSigned(endpoint, ak, as, ck, "GET", `/domain/zone/${zone}/record?${query}`);
  if (Array.isArray(out) && out.every(v => typeof v === "number")) return out as number[];
  return [];
}

async function ovhGetRecord(endpoint: string, ak: string, as: string, ck: string, zone: string, id: number): Promise<OvhRecord> {
  const out = await ovhSigned(endpoint, ak, as, ck, "GET", `/domain/zone/${zone}/record/${id}`);
  return out as OvhRecord;
}

async function ovhPutRecord(endpoint: string, ak: string, as: string, ck: string, zone: string, id: number, data: Record<string, unknown>): Promise<unknown> {
  return ovhSigned(endpoint, ak, as, ck, "PUT", `/domain/zone/${zone}/record/${id}`, data);
}

async function ovhDeleteRecord(endpoint: string, ak: string, as: string, ck: string, zone: string, id: number): Promise<unknown> {
  return ovhSigned(endpoint, ak, as, ck, "DELETE", `/domain/zone/${zone}/record/${id}`);
}

async function ovhCreateCname(endpoint: string, ak: string, as: string, ck: string, zone: string, sub: string): Promise<unknown> {
  return ovhSigned(endpoint, ak, as, ck, "POST", `/domain/zone/${zone}/record`, {
    fieldType: "CNAME",
    subDomain: sub,
    target: "cname.vercel-dns.com",
    ttl: 60,
  });
}

async function ovhRefresh(endpoint: string, ak: string, as: string, ck: string, zone: string): Promise<unknown> {
  return ovhSigned(endpoint, ak, as, ck, "POST", `/domain/zone/${zone}/refresh`, {});
}

// ---------- handlers ----------
export async function GET() {
  return json(200, { ok: true, hint: "Use POST", example: { subdomain: "demo123" } });
}

export async function POST(req: Request) {
  try {
    // secret
    const secret = req.headers.get("x-provisioning-secret") || "";
    if (secret !== envOrThrow("DOMAIN_PROVISIONING_SECRET")) {
      return json(401, { ok: false, error: "Unauthorized (secret)" });
    }

    // body
    const body = (await req.json().catch(() => ({}))) as Json;
    const parsed = SUBDOMAIN.safeParse(body?.subdomain);
    if (!parsed.success) {
      return json(400, { ok: false, error: "Invalid subdomain", details: parsed.error.flatten() });
    }
    const sub = parsed.data.toLowerCase();
    if (RESERVED.has(sub)) return json(422, { ok: false, error: "Subdomain reserved" });

    // env
    const zone = envOrThrow("PRIMARY_ZONE");
    const projectId = envOrThrow("VERCEL_PROJECT_ID");
    const token = envOrThrow("VERCEL_TOKEN");
    const ovhEndpoint = envOrThrow("OVH_API_ENDPOINT");
    const ovhAK = envOrThrow("OVH_APP_KEY");
    const ovhAS = envOrThrow("OVH_APP_SECRET");
    const ovhCK = envOrThrow("OVH_CONSUMER_KEY");

    const fqdn = `${sub}.${zone}`;

    // 1) Vercel add-domain (ignore 409)
    try {
      await vercelAddDomain(projectId, token, fqdn);
    } catch (err) {
      const msg = errorToString(err);
      if (!/409/.test(msg) && !/already in use/i.test(msg)) {
        return json(400, { ok: false, stage: "vercel-add-domain", error: msg });
      }
    }

    // 2) OVH — régler les conflits puis CNAME
    //    d'abord lister TOUT ce qui existe pour ce sous-domaine
    const anyIds = await ovhListRecordIds(ovhEndpoint, ovhAK, ovhAS, ovhCK, zone, `subDomain=${encodeURIComponent(sub)}`);

    let hasCorrectCname = false;
    if (anyIds.length > 0) {
      for (const id of anyIds) {
        const rec = await ovhGetRecord(ovhEndpoint, ovhAK, ovhAS, ovhCK, zone, id);
        if (rec.fieldType === "CNAME") {
          if ((rec.target || "").toLowerCase() === "cname.vercel-dns.com") {
            hasCorrectCname = true;
          } else {
            // on met à jour la cible
            await ovhPutRecord(ovhEndpoint, ovhAK, ovhAS, ovhCK, zone, id, { target: "cname.vercel-dns.com", ttl: 60 });
            hasCorrectCname = true;
          }
        } else {
          // autres types (A, TXT, etc.) -> on supprime pour éviter "CNAME and other data"
          await ovhDeleteRecord(ovhEndpoint, ovhAK, ovhAS, ovhCK, zone, id);
        }
      }
    }

    if (!hasCorrectCname) {
      await ovhCreateCname(ovhEndpoint, ovhAK, ovhAS, ovhCK, zone, sub);
    }

    await ovhRefresh(ovhEndpoint, ovhAK, ovhAS, ovhCK, zone);

    // 3) Vercel verify (non bloquant)
    try { await vercelVerifyDomain(projectId, token, fqdn); } catch { /* non-bloquant */ }

    return json(200, { ok: true, domain: fqdn });
  } catch (err) {
    return json(500, { ok: false, error: errorToString(err) });
  }
}
