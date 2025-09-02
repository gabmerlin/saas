// app/api/tenants/domains/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

// Exécuter côté Node
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Helpers ---
const SUBDOMAIN = z
  .string()
  .trim()
  .min(1, "subdomain required")
  .max(63)
  // pas de point, lettres/chiffres/tiret uniquement, pas de tiret en début/fin
  .regex(/^(?!-)[a-z0-9-]+(?<!-)$/i, "invalid subdomain");

const RESERVED = new Set(["www", "api", "cdn", "static"]);

function json(status: number, data: any) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function envOrThrow(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// --- Vercel client ---
async function vercelAddDomain(projectId: string, token: string, fqdn: string) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: fqdn }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Vercel add-domain failed: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

async function vercelVerifyDomain(projectId: string, token: string, fqdn: string) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${encodeURIComponent(fqdn)}/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vercel verify failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

// --- OVH client minimal (signé) ---
async function ovhSigned(
  endpoint: string,
  appKey: string,
  appSecret: string,
  consumerKey: string,
  method: "GET" | "POST",
  path: string,
  bodyObj?: any
) {
  const url = `${endpoint}${path}`;
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  // time
  const tRes = await fetch(`${endpoint}/auth/time`);
  const t = await tRes.text();
  const timestamp = parseInt(t, 10);

  // signature $1$<sha1>
  const toSign = `${appSecret}+${consumerKey}+${method}+${url}+${body}+${timestamp}`;
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
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
  return text ? JSON.parse(text) : {};
}

// --- Handlers ---
export async function GET() {
  return json(200, { ok: true, hint: "Use POST", example: { subdomain: "demo123" } });
}

export async function POST(req: Request) {
  try {
    // 1) Secret
    const secret = req.headers.get("x-provisioning-secret") || "";
    if (secret !== envOrThrow("DOMAIN_PROVISIONING_SECRET")) {
      return json(401, { ok: false, error: "Unauthorized (secret)" });
    }

    // 2) Parse
    const body = await req.json().catch(() => ({}));
    const parsed = SUBDOMAIN.safeParse(body?.subdomain);
    if (!parsed.success) {
      return json(400, { ok: false, error: "Invalid subdomain", details: parsed.error.flatten() });
    }
    const sub = parsed.data.toLowerCase();
    if (RESERVED.has(sub)) {
      return json(422, { ok: false, error: "Subdomain reserved" });
    }

    // 3) ENV
    const zone = envOrThrow("PRIMARY_ZONE"); // ex: qgchatting.com
    const projectId = envOrThrow("VERCEL_PROJECT_ID");
    const token = envOrThrow("VERCEL_TOKEN");
    const ovhEndpoint = envOrThrow("OVH_API_ENDPOINT");
    const ovhAppKey = envOrThrow("OVH_APP_KEY");
    const ovhAppSecret = envOrThrow("OVH_APP_SECRET");
    const ovhCK = envOrThrow("OVH_CONSUMER_KEY");

    const fqdn = `${sub}.${zone}`;

    // 4) Vercel: essaye d'ajouter le domain (si déjà présent, on ignore 409)
    try {
      await vercelAddDomain(projectId, token, fqdn);
    } catch (e: any) {
      // Si le domain est déjà dans le projet, Vercel renvoie 409 -> on ignore
      const msg = String(e?.message || e);
      if (!/409/.test(msg) && !/already in use/i.test(msg)) {
        // Pour debug côté client
        return json(400, { ok: false, stage: "vercel-add-domain", error: msg });
      }
    }

    // 5) OVH: CNAME -> cname.vercel-dns.com
    //   - check s'il existe déjà
    const list = await ovhSigned(ovhEndpoint, ovhAppKey, ovhAppSecret, ovhCK, "GET",
      `/domain/zone/${zone}/record?fieldType=CNAME&subDomain=${encodeURIComponent(sub)}`
    );

    if (!Array.isArray(list) || list.length === 0) {
      // créer
      await ovhSigned(ovhEndpoint, ovhAppKey, ovhAppSecret, ovhCK, "POST",
        `/domain/zone/${zone}/record`,
        { fieldType: "CNAME", subDomain: sub, target: "cname.vercel-dns.com", ttl: 60 }
      );
      // refresh
      await ovhSigned(ovhEndpoint, ovhAppKey, ovhAppSecret, ovhCK, "POST",
        `/domain/zone/${zone}/refresh`, {}
      );
    }

    // 6) Vérifier coté Vercel (génère le SSL ensuite)
    try {
      await vercelVerifyDomain(projectId, token, fqdn);
    } catch (e: any) {
      // Non bloquant : la vérification peut prendre un court délai
    }

    return json(200, { ok: true, domain: fqdn });

  } catch (e: any) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
}
