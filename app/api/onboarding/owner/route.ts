// app/api/onboarding/owner/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  userId: string;        // auth.users.id (UUID)
  name: string;
  subdomain: string;
  locale?: "fr" | "en";
};

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

const SUBDOMAIN_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid json body");
  }

  if (!body?.userId || !body?.name || !body?.subdomain) {
    return bad("missing fields: userId, name, subdomain");
  }
  if (!SUBDOMAIN_RE.test(body.subdomain)) {
    return bad("invalid subdomain format");
  }

  const locale = body.locale ?? "fr";

  // 1) Créer/Idempotent tenant (find by subdomain, else insert)
  let tenantId: string | undefined;
  try {
    const { data: existing, error: eFind } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("subdomain", body.subdomain)
      .single();

    if (eFind && eFind.code !== "PGRST116") {
      // PGRST116: no rows found (PostgREST)
      throw eFind;
    }
    if (existing?.id) {
      tenantId = existing.id;
    } else {
      const { data: inserted, error: eIns } = await supabaseAdmin
        .from("tenants")
        .insert({
          name: body.name,
          subdomain: body.subdomain,
          locale,
        })
        .select("id")
        .single();
      if (eIns) throw eIns;
      tenantId = inserted!.id;
    }
  } catch (e: any) {
    return bad(`create/find tenant failed: ${e.message}`, 500);
  }

  // 2) user_tenants (Owner) — idempotent (PK (user_id, tenant_id))
  try {
    const { error: eUT } = await supabaseAdmin
      .from("user_tenants")
      .insert({ user_id: body.userId, tenant_id: tenantId!, is_owner: true });

    // 23505 = unique_violation
    if (eUT && eUT.code !== "23505") throw eUT;
  } catch (e: any) {
    return bad(`user_tenants insert failed: ${e.message}`, 500);
  }

  // 3) user_roles → role owner — idempotent (PK (user_id, tenant_id, role_id))
  try {
    const { data: ownerRole, error: eRole } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("key", "owner")
      .single();

    if (eRole) throw eRole;
    if (ownerRole?.id) {
      const { error: eUR } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: body.userId, tenant_id: tenantId!, role_id: ownerRole.id });

      if (eUR && eUR.code !== "23505") throw eUR; // ignore unique_violation
    }
  } catch (e: any) {
    return bad(`user_roles insert failed: ${e.message}`, 500);
  }

  // 4) Appel interne au provisioning (domaine + CNAME + DB tenant_domains)
  const appBase = process.env.APP_BASE_URL;
  const secret = process.env.DOMAIN_PROVISIONING_SECRET;
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  if (!appBase || !secret || !rootDomain) {
    return bad("server env missing (APP_BASE_URL / DOMAIN_PROVISIONING_SECRET / NEXT_PUBLIC_ROOT_DOMAIN)", 500);
  }

  try {
    const res = await fetch(`${appBase}/api/tenants/domains`, {
      method: "POST",
      headers: {
        "x-provisioning-secret": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId,
        subdomain: body.subdomain,
        makePrimary: true,
        locale,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return bad(`provisioning failed: ${txt}`, 502);
    }
  } catch (e: any) {
    return bad(`provisioning request failed: ${e.message}`, 502);
  }

  // 5) URL finale
  const fqdn = `${body.subdomain}.${rootDomain}`;
  const redirect = `https://${fqdn}/${locale}`;

  return NextResponse.json({ ok: true, tenantId, fqdn, redirect });
}
