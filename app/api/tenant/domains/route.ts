import { NextResponse } from "next/server";
import { z } from "zod";

const ROOT = process.env.PRIMARY_ZONE!;
const SECRET = process.env.DOMAIN_PROVISIONING_SECRET!;

// 👉 à remettre quand tu veux activer la création réelle
async function vercelAddDomainToProject(name: string) {
  const token = process.env.VERCEL_TOKEN!;
  const projectId = process.env.VERCEL_PROJECT_ID!;
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Vercel add domain failed: ${JSON.stringify(data)}`);
  return data;
}

async function ovhAddCNAME(sub: string) {
  const endpoint = process.env.OVH_API_ENDPOINT ?? "https://eu.api.ovh.com/1.0";
  const APP_KEY = process.env.OVH_APP_KEY!;
  const APP_SECRET = process.env.OVH_APP_SECRET!;
  const CK = process.env.OVH_CONSUMER_KEY!;
  const zone = process.env.PRIMARY_ZONE!;

  const timeRes = await fetch(`${endpoint}/auth/time`, { cache: "no-store" });
  const ts = parseInt(await timeRes.text(), 10);

  const method = "POST";
  const path = `/domain/zone/${zone}/record`;
  const url = `${endpoint}${path}`;
  const body = JSON.stringify({
    fieldType: "CNAME",
    subDomain: sub,
    target: "cname.vercel-dns.com",
    ttl: 60,
  });

  const toSign = `${APP_SECRET}+${CK}+${method}+${url}+${body}+${ts}`;
  const sig = "$1$" + require("crypto").createHash("sha1").update(toSign).digest("hex");

  const res = await fetch(url, {
    method,
    headers: {
      "X-Ovh-Application": APP_KEY,
      "X-Ovh-Consumer": CK,
      "X-Ovh-Timestamp": String(ts),
      "X-Ovh-Signature": sig,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OVH add CNAME failed: ${await res.text()}`);

  // refresh
  const refreshPath = `/domain/zone/${zone}/refresh`;
  const refreshUrl = `${endpoint}${refreshPath}`;
  const toSign2 = `${APP_SECRET}+${CK}+POST+${refreshUrl}+${""}+${ts}`;
  const sig2 = "$1$" + require("crypto").createHash("sha1").update(toSign2).digest("hex");
  const res2 = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      "X-Ovh-Application": APP_KEY,
      "X-Ovh-Consumer": CK,
      "X-Ovh-Timestamp": String(ts),
      "X-Ovh-Signature": sig2,
    },
    cache: "no-store",
  });
  if (!res2.ok) throw new Error(`OVH refresh failed: ${await res2.text()}`);
}

const schema = z.object({
  subdomain: z.string().regex(/^[a-z0-9-]{3,63}$/),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!SECRET || req.headers.get("x-provisioning-secret") !== SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const { subdomain } = schema.parse(await req.json());
    const fqdn = `${subdomain}.${ROOT}`;

    await vercelAddDomainToProject(fqdn);
    await ovhAddCNAME(subdomain);

    return NextResponse.json({ ok: true, domain: fqdn });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
