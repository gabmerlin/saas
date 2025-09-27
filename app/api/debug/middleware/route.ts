import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') ?? '';
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com';
  
  // Simuler la logique d'extraction de sous-domaine
  function extractSubdomain(host: string, rootDomain: string): string | null {
    if (!host) return null;
    
    const defaultRoots = ['qgchatting.com', 'localhost:3000', 'vercel.app'];
    const roots = rootDomain ? [rootDomain, ...defaultRoots] : defaultRoots;
    
    const h = host.toLowerCase();
    
    for (const root of roots) {
      const rootLower = root.toLowerCase();
      if (h === rootLower || h === `www.${rootLower}`) continue;
      if (h.endsWith(`.${rootLower}`)) {
        const sub = h.slice(0, -(rootLower.length + 1));
        if (sub && sub !== 'www') {
          return sub;
        }
      }
    }
    
    return null;
  }
  
  const sub = extractSubdomain(host, root);
  
  return NextResponse.json({
    ok: true,
    debug: {
      pathname,
      host,
      root,
      sub,
      url: req.url,
      cookies: req.cookies.getAll().map(c => ({ name: c.name, value: c.value ? '***' : 'empty' })),
      headers: {
        'user-agent': req.headers.get('user-agent'),
        'referer': req.headers.get('referer'),
        'x-forwarded-host': req.headers.get('x-forwarded-host'),
        'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      }
    },
    at: new Date().toISOString()
  });
}
