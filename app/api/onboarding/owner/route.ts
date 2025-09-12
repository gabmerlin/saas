// api/onboarding/owner/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { OwnerOnboardingSchema } from "@/lib/validation/onboarding";
import { createTenantWithOwner, getServiceClient } from "@/lib/tenants";
import { addDomainToVercelProject } from "@/lib/vercel";
import { provisionSubdomainDNS } from "@/lib/ovh";
import { rateLimit } from "@/lib/utils/ratelimit";

function need(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`ENV_MISSING:${name}`);
  return v.trim();
}

export async function POST(req: Request) {
  // Debug des variables d'environnement
  console.log("[ENV DEBUG] SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("[ENV DEBUG] SUPABASE_ANON_KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log("[ENV DEBUG] SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("[ENV DEBUG] ROOT_DOMAIN:", !!process.env.ROOT_DOMAIN);
  console.log("[ENV DEBUG] VERCEL_TOKEN:", !!process.env.VERCEL_TOKEN);
  console.log("[ENV DEBUG] OVH_APP_KEY:", !!process.env.OVH_APP_KEY);
  
  // 0) Rate-limit
  const { ok } = await rateLimit("onboarding-owner", 5, 60);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  // 1) Auth requise - Création d'un client avec la clé anonyme
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  // Récupération du token d'auth depuis les cookies
  const rawToken = cookieStore.get('sb-ndlmzwwfwugtwpmebdog-auth-token')?.value;
  
  console.log("[AUTH DEBUG] Raw token:", rawToken?.substring(0, 50) + '...');
  
  let authToken: string | null = null;
  
  if (rawToken) {
    try {
      // Le token est stocké comme un tableau JSON, on doit le parser
      const tokenArray = JSON.parse(rawToken);
      if (Array.isArray(tokenArray) && tokenArray.length > 0) {
        authToken = tokenArray[0];
        console.log("[AUTH DEBUG] Parsed token from array:", authToken?.substring(0, 50) + '...');
      } else {
        authToken = rawToken;
        console.log("[AUTH DEBUG] Using raw token as string");
      }
    } catch (e) {
      // Si ce n'est pas du JSON, utiliser directement
      authToken = rawToken;
      console.log("[AUTH DEBUG] Token is not JSON, using as string");
    }
  }
  
  console.log("[AUTH DEBUG] Final auth token found:", !!authToken);
  console.log("[AUTH DEBUG] Token length:", authToken?.length || 0);
  console.log("[AUTH DEBUG] Token starts with:", authToken?.substring(0, 20) || 'none');
  
  if (!authToken) {
    console.log("[AUTH DEBUG] No auth token found in cookies");
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", detail: "No auth token found" },
      { status: 401 }
    );
  }

  // Vérification de l'utilisateur avec le token
  const { data: { user }, error: userErr } = await supabase.auth.getUser(authToken);
  console.log("[AUTH DEBUG] User verification result:", { user: !!user, error: userErr?.message });
  
  if (userErr || !user) {
    console.log("[AUTH DEBUG] Auth failed:", userErr?.message || "No user");
    return NextResponse.json(
      { ok: false, error: userErr ? "AUTH_ERROR" : "UNAUTHENTICATED", detail: userErr?.message },
      { status: 401 }
    );
  }
  
  console.log("[AUTH DEBUG] User authenticated successfully:", user.id);

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
    rootDomain = need("NEXT_PUBLIC_ROOT_DOMAIN");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ENV_MISSING:NEXT_PUBLIC_ROOT_DOMAIN";
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
    console.log("[CREATE DEBUG] Starting tenant creation for user:", user.id);
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
    console.log("[CREATE DEBUG] Tenant created successfully:", tenantId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[CREATE ERROR] Tenant creation failed:", msg);
    console.error("[CREATE ERROR] Full error:", e);
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
      steps: { vercel, ovh },
    },
    { status: 201 }
  );
}
