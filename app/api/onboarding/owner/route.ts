import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getErrorMessage, isPostgrestError, NO_ROWS_CODE, UNIQUE_VIOLATION } from "@/lib/errors";

type Body = {
  userId: string;
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

  // 1) find-or-create tenant
  let tenantId: string | undefined;
  try {
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
        .insert({ name: body.name, subdomain: body.subdomain, locale })
        .select("id")
        .single();
      if (eIns) throw eIns;
      tenantId = inserted!.id;
    }
  } catch (e: unknown) {
    const msg = isPostgrestError(e) ? e.message : getErrorMessage(e);
    return bad(`create/find tenant failed: ${msg}`, 500);
  }

  // 2) user_tenants (idempotent)
  try {
    const { error: eUT } = await supabaseAdmin
      .from("user_tenants")
      .insert({ user_id: body.userId, tenant_id: tenantId!, is_owner: true });

    if (eUT && (!isPostgrestError(eUT) || eUT.code !== UNIQUE_VIOLATION)) {
      throw eUT;
    }
  } catch (e: unknown) {
    const msg = isPostgrestError(e) ? e.message : getErrorMessage(e);
    return bad(`user_tenants insert failed: ${msg}`, 500);
  }

  // 3) user_roles (owner, idempotent)
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

      if (eUR && (!isPostgrestError(eUR) || eUR.code !== UNIQUE_VIOLATION)) {
        throw eUR;
      }
    }
  } catch (e: unknown) {
    const msg = isPostgrestError(e) ? e.message : getErrorMessage(e);
    return bad(`user_roles insert failed: ${msg}`, 500);
  }

  // 4) Call provisioning
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
      return bad(`provisioning failed: ${await res.text()}`, 502);
    }
  } catch (e: unknown) {
    return bad(`provisioning request failed: ${getErrorMessage(e)}`, 502);
  }

  const fqdn = `${body.subdomain}.${rootDomain}`;
  const redirect = `https://${fqdn}/${locale}`;
  return NextResponse.json({ ok: true, tenantId, fqdn, redirect });
}
