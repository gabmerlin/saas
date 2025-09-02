// app/api/tenants/domains/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { vercelAddDomainToProject, vercelGetDomainVerification } from "@/lib/vercel";
import { ovhCreateOrUpdateCNAME } from "@/lib/ovh";

type Body = {
  tenantId?: string;
  subdomain?: string;
  domain?: string;
  makePrimary?: boolean;
  locale?: "fr" | "en";
};

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-provisioning-secret");
  if (secret !== process.env.DOMAIN_PROVISIONING_SECRET) {
    return bad("unauthorized", 401);
  }

  const body = (await req.json()) as Body;
  const zone = process.env.PRIMARY_ZONE!;
  const makePrimary = body.makePrimary ?? true;

  // 1) calcul du domain
  const domain =
    body.domain ??
    (body.subdomain ? `${body.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : undefined);
  if (!domain) return bad("Missing domain/subdomain");

  // 2) vérifier/créer tenant si besoin
  let tenantId = body.tenantId;
  try {
    if (!tenantId && body.subdomain) {
      const { data: existing, error: e1 } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("subdomain", body.subdomain)
        .single();

      if (e1 && e1.code !== "PGRST116") {
        // PGRST116 = no rows found
        throw e1;
      }

      if (existing?.id) {
        tenantId = existing.id;
      } else {
        const { data: inserted, error: e2 } = await supabaseAdmin
          .from("tenants")
          .insert({
            name: body.subdomain,
            subdomain: body.subdomain,
            locale: body.locale ?? "fr",
          })
          .select("id")
          .single();

        if (e2) throw e2;
        tenantId = inserted!.id;
      }
    }
  } catch (e: any) {
    return bad(`create/find tenant failed: ${e.message}`, 500);
  }

  if (!tenantId) return bad("Missing tenantId");

  // 3) Ajout domaine Vercel (idempotent)
  try {
    await vercelAddDomainToProject(domain);
  } catch (e: any) {
    return bad(`vercel add domain failed: ${e.message}`, 502);
  }

  // 4) Ajout/MAJ CNAME OVH
  try {
    const sub = domain.replace(`.${zone}`, "");
    await ovhCreateOrUpdateCNAME(zone, sub, "cname.vercel-dns.com.");
  } catch (e: any) {
    return bad(`ovh CNAME failed: ${e.message}`, 502);
  }

  // 5) Vérification Vercel (optionnelle)
  try {
    await vercelGetDomainVerification(domain);
  } catch (e: any) {
    console.warn("vercel verification warning:", e.message);
  }

  // 6) Insert DB idempotent dans tenant_domains
  try {
    const { error: e3 } = await supabaseAdmin
      .from("tenant_domains")
      .insert({
        tenant_id: tenantId,
        domain,
        is_primary: makePrimary,
      })
      .select("id")
      .single();

    if (e3 && e3.code !== "23505") {
      // 23505 = unique_violation (déjà présent)
      throw e3;
    }

    if (e3?.code === "23505" && makePrimary) {
      // update si conflit et makePrimary
      await supabaseAdmin
        .from("tenant_domains")
        .update({ is_primary: true })
        .eq("domain", domain);
    }
  } catch (e: any) {
    return bad(`db insert tenant_domains failed: ${e.message}`, 500);
  }

  return NextResponse.json({ ok: true, tenantId, domain });
}
