// app/api/tenants/domains/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { ovhAddCNAME } from "@/lib/ovh";
import { vercelAddDomainToProject } from "@/lib/vercel";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/),
});

const ROOT = process.env.PRIMARY_ZONE!;
const SECRET = process.env.DOMAIN_PROVISIONING_SECRET!;

export async function POST(req: Request) {
  try {
    if (!SECRET || req.headers.get("x-provisioning-secret") !== SECRET) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { subdomain } = inputSchema.parse(body);
    const fqdn = `${subdomain}.${ROOT}`;

    // 1) Ajoute le domaine au projet Vercel (déclenche la vérification/SSL)
    await vercelAddDomainToProject(fqdn);

    // 2) Crée le CNAME chez OVH vers Vercel
    await ovhAddCNAME(subdomain, "cname.vercel-dns.com", 60);

    return NextResponse.json({ ok: true, domain: fqdn });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}
