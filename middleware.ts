import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['fr', 'en'] as const;
const defaultLocale = 'fr';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Ne jamais toucher aux API, fichiers statiques, _next, etc.
  if (
    pathname.startsWith('/api') ||               // <-- exclusion API
    pathname.startsWith('/_next') ||
    pathname.includes('.')                       // fichiers (ex: .ico, .png, .js)
  ) {
    return NextResponse.next();
  }

  // i18n: si pas de /fr|/en → redirige vers /fr
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

// ✅ Matcher qui exclut aussi /api
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
