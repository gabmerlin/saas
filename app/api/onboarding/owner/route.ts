import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getErrorMessage, isPostgrestError, NO_ROWS_CODE, UNIQUE_VIOLATION } from "@/lib/errors";

type Body = {
  userId?: string;        // si l’utilisateur est déjà connecté
  ownerEmail?: string;    // fallback si pas connecté
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

  if (!body?.name || !body?.subdomain) {
    return bad("missing fields: name, subdomain");
  }
  if (!SUBDOMAIN_RE.test(body.subdomain)) {
    return bad("invalid subdomain format");
  }
  const locale = body.locale ?? "fr";

  // 0) Résoudre l'owner : userId (session) OU ownerEmail (invite auto)
  let ownerUserId = body.userId?.trim();
  const ownerEmail = body.ownerEmail?.trim()?.toLowerCase();

  if (!ownerUserId && !ownerEmail) {
    return bad("missing fields: userId or ownerEmail");
  }

  if (!ownerUserId && ownerEmail) {
    // Tente d'inviter l'email et récupère l'id de l'utilisateur depuis la réponse
    try {
      const redirectTo = `${process.env.APP_BASE_URL?.replace(/\/+$/, "")}/auth/callback`;
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(ownerEmail, {
        redirectTo,
        data: { full_name: body.name },
      });

      // Cas 1: l'invite réussit et on reçoit un user id
      if (data?.user?.id) {
        ownerUserId = data.user.id;
      } else {
        // Cas 2: échec de l'invite (souvent "User already registered")
        // Dans ce cas, on ne peut pas récupérer l'id par email avec le SDK v2.
        // On demande à l'utilisateur de se connecter avec cet email pour finaliser.
        const reason = error?.message || "user is already registered";
        return bad(
          `owner email cannot be invited (${reason}). Please sign in with ${ownerEmail} and retry.`,
          409
        );
      }
    } catch (e: unknown) {
      return bad(`auth admin invite failed: ${getErrorMessage(e)}`, 500);
    }
  }

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
    return bad(`create/find tenant failed: ${getErrorMessage(e)}`, 500);
  }

  // 2) user_tenants (Owner) idempotent
  try {
    const { error: eUT } = await supabaseAdmin
      .from("user_tenants")
      .insert({ user_id: ownerUserId!, tenant_id: tenantId!, is_owner: true });

    if (eUT && (!isPostgrestError(eUT) || eUT.code !== UNIQUE_VIOLATION)) {
      throw eUT;
    }
  } catch (e: unknown) {
    return bad(`user_tenants insert failed: ${getErrorMessage(e)}`, 500);
  }

  // 3) user_roles (owner) idempotent
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
        .insert({ user_id: ownerUserId!, tenant_id: tenantId!, role_id: ownerRole.id });

      if (eUR && (!isPostgrestError(eUR) || eUR.code !== UNIQUE_VIOLATION)) {
        throw eUR;
      }
    }
  } catch (e: unknown) {
    return bad(`user_roles insert failed: ${getErrorMessage(e)}`, 500);
  }

  // 4) Provisioning domaine (DB only si WILDCARD_MODE=true)
  try {
    const res = await fetch(`${process.env.APP_BASE_URL}/api/tenants/domains`, {
      method: "POST",
      headers: {
        "x-provisioning-secret": process.env.DOMAIN_PROVISIONING_SECRET!,
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

  const fqdn = `${body.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`;
  const redirect = `https://${fqdn}/${locale}`;

  return NextResponse.json({ ok: true, tenantId, fqdn, redirect, ownerUserId });
}
