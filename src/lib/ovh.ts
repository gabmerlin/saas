// lib/ovh.ts
// Création/MàJ CNAME <sub>.<zone> -> <cible Vercel> chez OVH.
// - TTL forcé à 60s (Vercel/OVH OK)
// - target FQDN (se termine par ".")
// - Récupération automatique de la target CNAME via addDomainToVercelProject

import crypto from "crypto";
import { addDomainToVercelProject } from "@/lib/vercel"; // <- DOIT exister

const ENDPOINT = process.env.OVH_API_ENDPOINT || "https://eu.api.ovh.com/1.0";
const APP_KEY = process.env.OVH_APP_KEY!;
const APP_SECRET = process.env.OVH_APP_SECRET!;
const CONSUMER_KEY = process.env.OVH_CONSUMER_KEY!;

function must(name: string, v?: string | null) {
  if (!v || !v.trim()) throw new Error(`ENV_MISSING:${name}`);
  return v.trim();
}

async function ovhTime(): Promise<number> {
  const r = await fetch(`${ENDPOINT}/auth/time`, { cache: "no-store" });
  if (!r.ok) throw new Error(`OVH_TIME_FAILED ${r.status} ${await r.text()}`);
  const n = Number(await r.text());
  if (!Number.isFinite(n)) throw new Error("OVH_TIME_PARSE_ERROR");
  return n;
}

async function ovhSignedFetch(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
) {
  must("OVH_APP_KEY", APP_KEY);
  must("OVH_APP_SECRET", APP_SECRET);
  must("OVH_CONSUMER_KEY", CONSUMER_KEY);

  const url = `${ENDPOINT}${path}`;
  const now = await ovhTime();
  const data = body ? JSON.stringify(body) : "";

  const base = [APP_SECRET, CONSUMER_KEY, method, url, data, now].join("+");
  const sig = "$1$" + crypto.createHash("sha1").update(base).digest("hex");

  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": APP_KEY,
      "X-Ovh-Consumer": CONSUMER_KEY,
      "X-Ovh-Timestamp": String(now),
      "X-Ovh-Signature": sig,
      "Content-Type": "application/json",
    },
    body: data || undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* noop */ }
  if (!res.ok) throw new Error(`OVH ${method} ${path} -> ${res.status} ${text || "<empty>"}`);
  return { status: res.status, text, json };
}

/** Normalise la cible (FQDN) et fixe le TTL. */
function normalizeBody(sub: string, target: string) {
  const subNorm = sub.trim().toLowerCase();
  let fqdn = target.trim();
  if (!fqdn.endsWith(".")) fqdn += "."; // FQDN attendu par OVH
  return {
    fieldType: "CNAME" as const,
    subDomain: subNorm,
    target: fqdn,
    ttl: 60, // ✅ TTL fixe pour éviter Invalid Configuration côté Vercel
  };
}

/** Essaie d'extraire la valeur CNAME renvoyée par l'API Vercel (plusieurs formats possibles). */
function extractVercelCnameTarget(resp: unknown): string | null {
  const obj = (resp ?? {}) as Record<string, unknown>;

  const v = obj["verification"];
  if (Array.isArray(v)) {
    const arr = v as Array<Record<string, unknown>>;
    const cname = arr.find((x) => {
      const t = x?.["type"];
      const val = x?.["value"];
      return typeof t === "string" && t.toLowerCase() === "cname" && typeof val === "string" && val.length > 0;
    });
    if (cname && typeof cname["value"] === "string") return String(cname["value"]);
  }

  const cnameTargets = obj["cnameTargets"];
  if (Array.isArray(cnameTargets) && cnameTargets[0]) return String(cnameTargets[0]);

  const cnameTarget = obj["cnameTarget"];
  if (cnameTarget) return String(cnameTarget);

  if (process.env.VERCEL_DEFAULT_CNAME) return process.env.VERCEL_DEFAULT_CNAME;

  return null;
}

export async function ovhCreateOrUpdateCNAME(
  zone: string,
  sub: string,
  target: string
) {
  const recordPath = `/domain/zone/${zone}/record`;

  // 1) Recherche existant
  const q = `?subDomain=${encodeURIComponent(sub)}&fieldType=CNAME`;
  const list = await ovhSignedFetch("GET", recordPath + q);
  const ids: number[] = Array.isArray((list as { json: unknown }).json) ? ((list as { json: unknown }).json as number[]) : [];

  const body = normalizeBody(sub, target);

  // 2) Create / Update
  if (ids.length === 0) {
    await ovhSignedFetch("POST", recordPath, body);
  } else {
    const id = ids[0];
    await ovhSignedFetch("PUT", `${recordPath}/${id}`, body);
  }

  // 3) Refresh zone
  await ovhSignedFetch("POST", `/domain/zone/${zone}/refresh`);

  return { ok: true, zone, sub: body.subDomain, target: body.target, ttl: body.ttl };
}

/**
 * Provisionne le CNAME côté OVH pour <sub>.<ROOT_DOMAIN>.
 *  - Appelle Vercel pour ajouter le domaine et récupérer la cible CNAME spécifique.
 *  - Crée/MàJ l'entrée CNAME côté OVH avec TTL 60.
 */
export async function provisionSubdomainDNS(
  sub: string
) {
  const zone = must("ROOT_DOMAIN", process.env.ROOT_DOMAIN);
  const domain = `${sub}.${zone}`;

  // 1) Ajout/ensure côté Vercel + récupération de la cible exacte
  const vercelResp = await addDomainToVercelProject(domain);
  const cnameTarget = extractVercelCnameTarget(vercelResp) || "cname.vercel-dns.com";

  // 2) Création/MàJ côté OVH
  return ovhCreateOrUpdateCNAME(zone, sub, cnameTarget);
}
