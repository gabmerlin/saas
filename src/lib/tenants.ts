// lib/tenants.ts
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVER_CONFIG } from "@/lib/supabase/config";

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role -> pour bypass RLS côté provisioning
    SUPABASE_SERVER_CONFIG
  );
}

type CreateTenantParams = {
  agencyName: string;
  agencySlug: string;
  subdomain: string;
  primaryColor: string;
  logoUrl?: string;
  locale: string;
  timezone: string;
  userId: string; // auth.users.id
};

export async function createTenantWithOwner(p: CreateTenantParams) {
  const supabase = getServiceClient();

  // 0) Récupérer role_id 'owner'
  const { data: ownerRole, error: roleErr } = await supabase
    .from("roles").select("id, key").eq("key", "owner").single();
  if (roleErr || !ownerRole) throw new Error("OWNER_ROLE_NOT_FOUND");

  // 1) Créer tenant
  const tenantId = randomUUID();
  const theme = {
    primary_color: p.primaryColor,
    logo_url: p.logoUrl || null,
    agency_slug: p.agencySlug,
    timezone: p.timezone,
  };

  const { error: tErr } = await supabase
    .from("tenants")
    .insert({
      id: tenantId,
      name: p.agencyName,
      subdomain: p.subdomain,
      locale: p.locale,
      theme: theme as Record<string, unknown>
    });
  if (tErr) {
    if (/tenants_subdomain_key|subdomain/.test(tErr.message)) {
      throw new Error("SUBDOMAIN_TAKEN");
    }
    throw new Error(`TENANT_CREATE_FAILED: ${tErr.message}`);
  }

  // 2) Déclarer domaine primaire dans tenant_domains
  const fullDomain = `${p.subdomain}.${process.env.ROOT_DOMAIN!}`;
  const { error: dErr } = await supabase
    .from("tenant_domains")
    .insert({
      tenant_id: tenantId,
      domain: fullDomain,
      is_primary: true
    });
  if (dErr) {
    if (/tenant_domains_domain_key|domain/.test(dErr.message)) {
      throw new Error("DOMAIN_TAKEN");
    }
    throw new Error(`DOMAIN_CREATE_FAILED: ${dErr.message}`);
  }

  // 3) Marquer l'utilisateur comme membre & owner du tenant
  const { error: utErr } = await supabase
    .from("user_tenants")
    .insert({ user_id: p.userId, tenant_id: tenantId, is_owner: true });
  if (utErr) throw new Error(`USER_TENANT_LINK_FAILED: ${utErr.message}`);

  // 4) Affecter le rôle 'owner'
  const { error: urErr } = await supabase
    .from("user_roles")
    .insert({ user_id: p.userId, tenant_id: tenantId, role_id: ownerRole.id });
  if (urErr) throw new Error(`USER_ROLE_ASSIGN_FAILED: ${urErr.message}`);

  return { tenantId, fullDomain };
}
