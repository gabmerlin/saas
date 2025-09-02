// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// i18n
const locales = ["fr", "en"] as const;
const defaultLocale = "fr";

// Supabase (utilisation du client public côté edge)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper: extraire domaine racine et sous-domaine de manière tolérante
function parseHost(host: string) {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  const h = host.toLowerCase();

  // Cas localhost/127.0.0.1 : pas de multi-tenant
  if (h.startsWith("localhost") || h.startsWith("127.0.0.1")) {
    return { isRoot: true, rootDomain: "", subdomain: "", fqdn: h };
  }

  // Si root est défini (prod/vercel), on s’y fie
  if (root && (h === root || h.endsWith(`.${root}`))) {
    const sub = h === root ? "" : h.slice(0, -(root.length + 1));
    return { isRoot: h === root, rootDomain: root, subdomain: sub, fqdn: h };
  }

  // Fallback dev: on suppose un TLD simple (deux labels, ex: qgchatting.com)
  const parts = h.split(":")[0].split("."); // strip port éventuel
  if (parts.length <= 2) {
    // ex: qgchatting.com → racine
    return { isRoot: true, rootDomain: parts.join("."), subdomain: "", fqdn: h };
  }
  const rootDomain = parts.slice(-2).join("."); // qgchatting.com
  const subdomain = parts.slice(0, -2).join("."); // ex: demo6
  return { isRoot: false, rootDomain, subdomain, fqdn: h };
}

// i18n redirect helper
function withLocale(req: NextRequest, res: NextResponse) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (!hasLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // 1) Bypass API/auth/statics
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2) Analyse du host
  const { isRoot, subdomain, fqdn } = parseHost(host);

  // 3) Domaine racine (landing/onboarding marketing) → juste i18n
  if (isRoot || !subdomain) {
    return withLocale(req, NextResponse.next());
  }

  // 4) Résolution tenant (double-tentative: par domaine PUIS par sous-domaine)
  try {
    // a) par domaine exact (tenant_domains.domain)
    let { data, error } = await supabase.rpc("tenant_by_domain", {
      p_domain: fqdn,
    });

    if (error) {
      console.error("tenant_by_domain error:", error);
    }

    // b) fallback par sous-domaine (public.tenants.subdomain)
    if (!data || data.length === 0) {
      const { data: data2, error: error2 } = await supabase.rpc(
        "tenant_id_by_subdomain",
        { p_subdomain: subdomain.split(".")[0] } // si multi-niveaux, on prend le 1er label
      );
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
      return withLocale(req, res);
    }

    // Aucun tenant trouvé → onboarding
    return NextResponse.redirect(new URL("/onboarding/owner", req.url));
  } catch (e) {
    console.error("Middleware exception:", e);
    return NextResponse.redirect(new URL("/onboarding/owner", req.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\..*).*)"],
};
