// app/lib/ovh.ts
import crypto from "crypto";

const OVH_ENDPOINT = process.env.OVH_API_ENDPOINT ?? "https://eu.api.ovh.com/1.0";
const APP_KEY = process.env.OVH_APP_KEY!;
const APP_SECRET = process.env.OVH_APP_SECRET!;
const CONSUMER_KEY = process.env.OVH_CONSUMER_KEY!;
const ZONE = process.env.PRIMARY_ZONE!;

async function ovhTime(): Promise<number> {
  const r = await fetch(`${OVH_ENDPOINT}/auth/time`, { cache: "no-store" });
  const t = await r.text();
  return parseInt(t, 10);
}

function ovhSign(method: string, url: string, body: string, ts: number): string {
  const base = `${APP_SECRET}+${CONSUMER_KEY}+${method.toUpperCase()}+${url}+${body}+${ts}`;
  const sha1 = crypto.createHash("sha1").update(base).digest("hex");
  return `$1$${sha1}`;
}

async function ovhRequest<T>(method: string, path: string, payload?: unknown): Promise<T> {
  const url = `${OVH_ENDPOINT}${path}`;
  const body = payload ? JSON.stringify(payload) : "";
  const ts = await ovhTime();
  const sig = ovhSign(method, url, body, ts);

  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": APP_KEY,
      "X-Ovh-Consumer": CONSUMER_KEY,
      "X-Ovh-Signature": sig,
      "X-Ovh-Timestamp": String(ts),
      "Content-Type": "application/json",
    },
    body: body || undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OVH ${method} ${path} -> ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function ovhAddCNAME(sub: string, target = "cname.vercel-dns.com", ttl = 60) {
  await ovhRequest("POST", `/domain/zone/${ZONE}/record`, {
    fieldType: "CNAME",
    subDomain: sub,
    target,
    ttl,
  });
  await ovhRequest("POST", `/domain/zone/${ZONE}/refresh`);
}
