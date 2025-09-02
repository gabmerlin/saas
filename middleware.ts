// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const locales = ["fr", "en"] as const;
const defaultLocale = "fr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // 1. Exclure API, Auth, Next internals, fichiers statiques
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Résolution tenant par domaine
  if (
    host !== process.env.NEXT_PUBLIC_ROOT_DOMAIN &&
    host.endsWith(`.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`)
  ) {
    try {
      const { data, error } = await supabase.rpc("tenant_by_domain", {
        p_domain: host,
      });

      if (error) {
        console.error("❌ tenant_by_domain error:", error);
        return NextResponse.redirect(new URL("/onboarding/owner", req.url));
      }

      if (!data || data.length === 0) {
        return NextResponse.redirect(new URL("/onboarding/owner", req.url));
      }

      const tenant = data[0];
      const res = NextResponse.next();
      res.headers.set("x-tenant-id", tenant.id);
      res.headers.set("x-tenant-subdomain", tenant.subdomain);
      return handleLocale(req, res);
    } catch (e) {
      console.error("❌ Middleware exception:", e);
      return NextResponse.redirect(new URL("/onboarding/owner", req.url));
    }
  }

  // 3. Si domaine racine (landing, marketing, onboarding)
  return handleLocale(req, NextResponse.next());
}

// Helper i18n
function handleLocale(req: NextRequest, res: NextResponse) {
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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\..*).*)"],
};
