// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// i18n
const locales = ["fr", "en"] as const;
const defaultLocale = "fr";
const LOCALE_PREFIX = `/${defaultLocale}`;
const ONBOARDING_PATH = "/onboarding/owner";

// Supabase (edge-friendly)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Helpers ---

function isStaticOrApi(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  );
}

function hasLocalePrefix(pathname: string) {
  return locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

// onboarding peut exister en version sans locale (/onboarding/owner) ou avec locale (/fr/onboarding/owner)
function isOnboardingPath(pathname: string) {
  if (pathname === ONBOARDING_PATH || pathname.startsWith(ONBOARDING_PATH + "/")) return true;
  return locales.some((l) => pathname === `/${l}${ONBOARDING_PATH}` || pathname.startsWith(`/${l}${ONBOARDING_PATH}/`));
}

// redirection i18n
function ensureLocale(req: NextRequest, res: NextResponse) {
  const { pathname } = req.nextUrl;
  if (hasLocalePrefix(pathname)) return res;

  const url = req.nextUrl.clone();
  url.pathname = `${LOCALE_PREFIX}${pathname}`;
  return NextResponse.redirect(url);
}

// parse host de façon tolérante
function parseHost(host: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  const h = host.toLowerCase();
  const hostname = h.split(":")[0];

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return { isRoot: true, rootDomain: "", subdomain: "", fqdn: hostname };
  }

  if (root && (hostname === root || hostname.endsWith(`.${root}`))) {
    const sub = hostname === root ? "" : hostname.slice(0, -(root.length + 1));
    return { isRoot: hostname === root, rootDomain: root, subdomain: sub, fqdn: hostname };
  }

  const parts = hostname.split(".");
  if (parts.length <= 2) {
    return { isRoot: true, rootDomain: parts.join("."), subdomain: "", fqdn: hostname };
  }
  const rootDomain = parts.slice(-2).join(".");
  const subdomain = parts.slice(0, -2).join(".");
  return { isRoot: false, rootDomain, subdomain, fqdn: hostname };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // 1) Bypass API/auth/statics
  if (isStaticOrApi(pathname)) {
    return NextResponse.next();
  }

  // 2) Toujours autoriser l'onboarding (et juste lui mettre la locale si absente)
  if (isOnboardingPath(pathname)) {
    return ensureLocale(req, NextResponse.next());
  }

  // 3) Analyse du host
  const { isRoot, subdomain, fqdn } = parseHost(host);

  // 4) Domaine racine → pas de résolution, juste i18n
  if (isRoot || !subdomain) {
    return ensureLocale(req, NextResponse.next());
  }

  // 5) Résolution tenant (par domaine puis fallback par sous-domaine)
  try {
    // a) par domaine exact (tenant_domains.domain)
    let { data, error } = await supabase.rpc("tenant_by_domain", { p_domain: fqdn });
    if (error) {
      console.error("tenant_by_domain error:", error);
    }

    // b) fallback: par 1er label de subdomain (public.tenants.subdomain)
    if (!data || data.length === 0) {
      const firstLabel = subdomain.split(".")[0];
      const { data: data2, error: error2 } = await supabase.rpc("tenant_id_by_subdomain", {
        p_subdomain: firstLabel,
      });
      if (error2) {
        console.error("tenant_id_by_subdomain error:", error2);
      }
      if (data2 && data2.length > 0) {
        data = data2;
      }
    }

    if (data && data.length > 0) {
      const tenant = data[0];
      const res = NextResponse.next();
      res.headers.set("x-tenant-id", tenant.id);
      res.headers.set("x-tenant-subdomain", tenant.subdomain);
      return ensureLocale(req, res);
    }

    // 6) Aucun tenant → rediriger vers **URL localisée** d'onboarding
    const url = req.nextUrl.clone();
    url.pathname = `${LOCALE_PREFIX}${ONBOARDING_PATH}`;
    return NextResponse.redirect(url);
  } catch (e) {
    console.error("Middleware exception:", e);
    const url = req.nextUrl.clone();
    url.pathname = `${LOCALE_PREFIX}${ONBOARDING_PATH}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\..*).*)"],
};
