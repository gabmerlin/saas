import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const userAgent = req.headers.get('user-agent') ?? '';
  const referer = req.headers.get('referer') ?? '';
  
  // Simuler la logique d'extraction du subdomain
  function extractSubdomain(host: string, rootDomain: string): string | null {
    if (!host) return null
    
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

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? '';
  const subdomain = extractSubdomain(host, rootDomain);

  return NextResponse.json({
    host,
    rootDomain,
    subdomain,
    userAgent,
    referer,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    }
  });
}
