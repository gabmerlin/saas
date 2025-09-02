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
  subdomain: z
    .string()
    .regex(/^[a-z0-9-]{3,63}$/),
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
  // certaines routes OVH renvoient vide → on type sur unknown puis cast si besoin
  return (await res.json().catch(() => ({}))) as T;
}

async function ovhAddCNAME(sub: string): Promise<void> {
  await ovhRequest("POST", `/domain/zone/${PRIMARY_ZONE}/record`, {
    fieldType: "CNAME",
    subDomain: sub,
    target: "cname.vercel-dns.com",
    ttl: 60,
  });
  await ovhRequest("POST", `/domain/zone/${PRIMARY_ZONE}/refresh`);
}

// ===== Utils Vercel =====
async function vercelAddDomainToProject(name: string): Promise<void> {
  const r = await fetch(
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
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Vercel add domain failed: ${r.status} ${text}`);
  }
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

    // 1) Déclare le domaine à Vercel (pour SSL + routing)
    await vercelAddDomainToProject(fqdn);

    // 2) Crée le CNAME côté OVH + refresh
    await ovhAddCNAME(subdomain);

    return NextResponse.json({ ok: true, domain: fqdn });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
