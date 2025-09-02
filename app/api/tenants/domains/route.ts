import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { vercelAddDomainToProject, vercelGetDomainVerification } from "@/lib/vercel";
import { ovhCreateOrUpdateCNAME } from "@/lib/ovh";
import { getErrorMessage, isPostgrestError, NO_ROWS_CODE, UNIQUE_VIOLATION } from "@/lib/errors";

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

  const zone = process.env.PRIMARY_ZONE;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  if (!zone || !root) return bad("server env missing (PRIMARY_ZONE / NEXT_PUBLIC_ROOT_DOMAIN)", 500);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid json body");
  }

  const makePrimary = body.makePrimary ?? true;
  const domain = body.domain ?? (body.subdomain ? `${body.subdomain}.${root}` : undefined);
  if (!domain) return bad("Missing domain/subdomain");

  // 1) find-or-create tenant
  let tenantId = body.tenantId;
  try {
    if (!tenantId && body.subdomain) {
      const { data: existing, error: eFind } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("subdomain", body.subdomain)
        .single();

      if (eFind && (!isPostgrestError(eFind) || eFind.code !== NO_ROWS_CODE)) {
        throw eFind;
      }
      if (existing?.id) {
        tenantId = existing.id;
      } else {
        const { data: inserted, error: eIns } = await supabaseAdmin
          .from("tenants")
          .insert({ name: body.subdomain, subdomain: body.subdomain, locale: body.locale ?? "fr" })
          .select("id")
          .single();
        if (eIns) throw eIns;
        tenantId = inserted!.id;
      }
    }
  } catch (e: unknown) {
    const msg = isPostgrestError(e) ? e.message : getErrorMessage(e);
    return bad(`create/find tenant failed: ${msg}`, 500);
  }
  if (!tenantId) return bad("Missing tenantId");

  // 2) Vercel project domain (idempotent)
  try {
    await vercelAddDomainToProject(domain);
  } catch (e: unknown) {
    return bad(`vercel add domain failed: ${getErrorMessage(e)}`, 502);
  }

  // 3) OVH CNAME to vercel-dns
  try {
    const sub = domain.replace(`.${zone}`, "");
    await ovhCreateOrUpdateCNAME(zone, sub, "cname.vercel-dns.com.");
  } catch (e: unknown) {
    return bad(`ovh CNAME failed: ${getErrorMessage(e)}`, 502);
  }

  // 4) Vercel verification (best-effort)
  try {
    await vercelGetDomainVerification(domain);
  } catch {
    // ignore / log if needed
  }

  // 5) DB insert tenant_domains (idempotent)
  try {
    const { error: eIns } = await supabaseAdmin
      .from("tenant_domains")
      .insert({ tenant_id: tenantId, domain, is_primary: makePrimary })
      .select("id")
      .single();

    if (eIns && (!isPostgrestError(eIns) || eIns.code !== UNIQUE_VIOLATION)) {
      throw eIns;
    }

    if (eIns && isPostgrestError(eIns) && eIns.code === UNIQUE_VIOLATION && makePrimary) {
      await supabaseAdmin
        .from("tenant_domains")
        .update({ is_primary: true })
        .eq("domain", domain);
    }
  } catch (e: unknown) {
    const msg = isPostgrestError(e) ? e.message : getErrorMessage(e);
    return bad(`db insert tenant_domains failed: ${msg}`, 500);
  }

  return NextResponse.json({ ok: true, tenantId, domain });
}
