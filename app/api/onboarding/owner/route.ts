// api/onboarding/owner/route.ts
import { NextResponse } from "next/server";
import { createClient, createClientWithSession } from "@/lib/supabase/server";
import { OwnerOnboardingSchema } from "@/lib/validation/onboarding";
import { createTenantWithOwner, getServiceClient } from "@/lib/tenants";
import { addDomainToVercelProject } from "@/lib/vercel";
import { provisionSubdomainDNS } from "@/lib/ovh";
import { rateLimit } from "@/lib/utils/ratelimit";

export const runtime = 'nodejs';

export async function POST(req: Request) {
  
  // 0) Rate-limit
  const { ok } = await rateLimit("onboarding-owner", 5, 60);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  // 1) Auth requise - Vérification via les headers de la requête
  const authHeader = req.headers.get('authorization');
  const sessionToken = req.headers.get('x-session-token');
  
  let user: { id: string; email?: string } | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Utilisation du token Bearer
    const token = authHeader.substring(7);
    const supabase = createClient();
    const { data: { user: tokenUser }, error: userErr } = await supabase.auth.getUser(token);
    
    if (!userErr && tokenUser) {
      user = tokenUser;
    }
  } else if (sessionToken) {
    // Utilisation du token de session
    const supabase = createClient();
    const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser(sessionToken);
    
    if (!userErr && sessionUser) {
      user = sessionUser;
    }
  } else {
    // Fallback: essayer avec les cookies
    const supabase = await createClientWithSession();
    const { data: { user: cookieUser }, error: userErr } = await supabase.auth.getUser();
    
    if (!userErr && cookieUser) {
      user = cookieUser;
    }
  }
  
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", detail: "No valid authentication found" },
      { status: 401 }
    );
  }

  // 2) Corps JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "EMPTY_OR_INVALID_JSON" }, { status: 400 });
  }

  // 3) Validation (zod)
  const parsed = OwnerOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // 4) ENV + FQDN
  let rootDomain: string;
  try {
    // Essayer d'abord la variable serveur, puis la variable publique
    rootDomain = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
    if (!rootDomain) {
      throw new Error("ENV_MISSING:ROOT_DOMAIN or NEXT_PUBLIC_ROOT_DOMAIN");
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ENV_MISSING:ROOT_DOMAIN";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
  const fullDomain = `${input.subdomain}.${rootDomain}`;

  // 5) Unicité DB - Utilisation du service client pour les opérations DB
  const srv = getServiceClient();

  const { data: tExists, error: tErr } = await srv
    .from("tenants")
    .select("id")
    .eq("subdomain", input.subdomain)
    .maybeSingle();
  if (tErr) {
    return NextResponse.json(
      { ok: false, error: "DB_ERROR_TENANT_CHECK", detail: tErr.message },
      { status: 500 }
    );
  }
  if (tExists) {
    return NextResponse.json({ ok: false, error: "SUBDOMAIN_TAKEN" }, { status: 409 });
  }

  const { data: dExists, error: dErr } = await srv
    .from("tenant_domains")
    .select("id")
    .eq("domain", fullDomain)
    .maybeSingle();
  if (dErr) {
    return NextResponse.json(
      { ok: false, error: "DB_ERROR_DOMAIN_CHECK", detail: dErr.message },
      { status: 500 }
    );
  }
  if (dExists) {
    return NextResponse.json({ ok: false, error: "DOMAIN_TAKEN" }, { status: 409 });
  }

  // 6) Création tenant + owner
  let tenantId: string | null = null;
  try {
    const res = await createTenantWithOwner({
      agencyName: input.agencyName,
      agencySlug: input.agencySlug,
      subdomain: input.subdomain,
      primaryColor: input.primaryColor,
      logoUrl: input.logoUrl || undefined,
      locale: input.locale,
      timezone: "UTC",
      userId: user.id,
    });
    tenantId = res.tenantId;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "CREATE_FAILED", detail: msg }, { status: 500 });
  }

  // 7) Vercel (best-effort) → pas de spread sur 'ok'
  let vercel: { ok: boolean; details?: unknown; error?: string } = { ok: false };
  try {
    const details = await addDomainToVercelProject(fullDomain);
    vercel = { ok: true, details };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[VERCEL] add domain failed:", msg);
    vercel = { ok: false, error: msg };
  }

  // 8) OVH (best-effort) → pas de spread sur 'ok'
  let ovh: { ok: boolean; details?: unknown; error?: string } = { ok: false };
  if (process.env.OVH_APP_KEY && process.env.OVH_APP_SECRET && process.env.OVH_CONSUMER_KEY) {
    try {
      // Ta fonction 1-argument (subdomain). Si tu as une signature différente, adapte ici.
      const details = await provisionSubdomainDNS(input.subdomain);
      ovh = { ok: true, details };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[OVH] DNS create failed:", msg);
      ovh = { ok: false, error: msg };
    }
  } else {
    ovh = { ok: false, error: "OVH_ENV_MISSING" };
  }

  // 9) Réponse
    return NextResponse.json(
    { 
      ok: true,
      tenantId,
      domain: fullDomain,
      agencyUrl: `https://${fullDomain}`,
      subdomain: input.subdomain,
      steps: { vercel, ovh },
    },
    { status: 201 }
  );
}

