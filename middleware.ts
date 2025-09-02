import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['fr', 'en'] as const;
const defaultLocale = 'fr';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ⚠️ Ne pas toucher aux API, assets, Next internals et AUTH
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||   // <--- clé
    pathname.startsWith('/_next') ||
    pathname.includes('.')            // fichiers (ico, png, js, etc.)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (!hasLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Exclut clairement toutes les routes API/Next/statics
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\..*).*)",
  ],
};