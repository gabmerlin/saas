import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubdomainFromHost } from '@/lib/tenant';

const locales = ['fr', 'en'] as const;
const defaultLocale = 'fr';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const sub = getSubdomainFromHost(req.headers.get('host'));
  if (sub) res.headers.set('x-tenant-subdomain', sub); // debug/info
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
