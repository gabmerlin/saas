// app/api/tenants/domains/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

// ===== ENV =====
const OVH_ENDPOINT = process.env.OVH_API_ENDPOINT ?? "https://eu.api.ovh.com/1.0";
const OVH_APP_KEY = process.env.OVH_APP_KEY!;
const OVH_APP_SECRET = process.env.OVH_APP_SECRET!;
const OVH_CONSUMER_KEY = process.env.OVH_CONSUMER_KEY!;
const PRIMARY_ZONE = process.env.PRIMARY_ZONE!;

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID!;

const PROVISIONING_SECRET = process.env.DOMAIN_PROVISIONING_SECRET!;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== Validation =====
const schema = z.object({
  subdomain: z.string().regex(/^[a-z0-9-]{3,63}$/),
});

// ===== Utils OVH =====
async function ovhTime(): Promise<number> {
  const r = await fetch(`${OVH_ENDPOINT}/auth/time`, { cache: "no-store" });
  const t = await r.text();
  return parseInt(t, 10);
}

function ovhSign(method: string, url: string, body: string, ts: number): string {
  const base = `${OVH_APP_SECRET}+${OVH_CONSUMER_KEY}+${method.toUpperCase()}+${url}+${body}+${ts}`;
  const sha1 = crypto.createHash("sha1").update(base).digest("hex");
  return `$1$${sha1}`;
}

async function ovhRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  payload?: unknown
): Promise<T> {
  const url = `${OVH_ENDPOINT}${path}`;
  const body = payload ? JSON.stringify(payload) : "";
  const ts = await ovhTime();

  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": OVH_APP_KEY,
      "X-Ovh-Consumer": OVH_CONSUMER_KEY,
      "X-Ovh-Timestamp": String(ts),
      "X-Ovh-Signature": ovhSign(method, url, body, ts),
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    body: body || undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OVH ${method} ${path} -> ${res.status} ${text}`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

async function ovhRecordExists(sub: string): Promise<boolean> {
  const ids = await ovhRequest<number[]>(
    "GET",
    `/domain/zone/${PRIMARY_ZONE}/record?fieldType=CNAME&subDomain=${encodeURIComponent(sub)}`
  );
  return Array.isArray(ids) && ids.length > 0;
}

async function ovhEnsureCNAME(sub: string): Promise<void> {
  if (await ovhRecordExists(sub)) return;
  await ovhRequest("POST", `/domain/zone/${PRIMARY_ZONE}/record`, {
    fieldType: "CNAME",
    subDomain: sub,
    target: "cname.vercel-dns.com",
    ttl: 60,
  });
  await ovhRequest("POST", `/domain/zone/${PRIMARY_ZONE}/refresh`);
}

// ===== Utils Vercel =====
async function vercelEnsureDomain(name: string): Promise<void> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
      cache: "no-store",
    }
  );
  if (res.ok) return;

  const text = await res.text();
  // 409 domain_already_in_use => OK si c'est notre projet
  try {
    const data = JSON.parse(text);
    if (
      res.status === 409 &&
      data?.error?.code === "domain_already_in_use"
    ) {
      const pid = data?.error?.domain?.projectId ?? data?.error?.projectId;
      if (!pid || pid === VERCEL_PROJECT_ID) {
        // Déjà attaché à CE projet -> considérer OK
        return;
      }
      // Attaché à un AUTRE projet -> à transférer manuellement
      throw new Error(
        `domain_in_other_project:${pid}`
      );
    }
  } catch {
    // ignore JSON parse
  }
  throw new Error(`Vercel add domain failed: ${res.status} ${text}`);
}

// ===== Handlers =====
export async function GET() {
  return NextResponse.json({ ok: true, hint: "Use POST" });
}

export async function POST(req: Request) {
  try {
    if (!PROVISIONING_SECRET || req.headers.get("x-provisioning-secret") !== PROVISIONING_SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const json = (await req.json().catch(() => ({}))) as unknown;
    const { subdomain } = schema.parse(json);
    const fqdn = `${subdomain}.${PRIMARY_ZONE}`;

    // 1) Ajoute/garantit le domaine dans le projet Vercel (409 traité comme OK)
    await vercelEnsureDomain(fqdn);

    // 2) Crée/garantit le CNAME côté OVH
    await ovhEnsureCNAME(subdomain);

    return NextResponse.json({ ok: true, domain: fqdn });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    // Améliore le message si attaché à un autre projet
    if (message.startsWith("domain_in_other_project:")) {
      const other = message.split(":")[1];
      return NextResponse.json(
        {
          ok: false,
          error:
            `Le domaine est déjà attaché à un autre projet Vercel (${other}). ` +
            `Va dans Vercel → Domaines → "Transfer" vers ce projet, puis relance.`,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
