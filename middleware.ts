// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/tenants'

const PUBLIC_FILE = /\.(.*)$/

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host') ?? ''
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com'
  const sub = extractSubdomain(host, root)
  
  // Ignore API, fichiers statiques, _next, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    PUBLIC_FILE.test(pathname)
  ) {
    if (sub) {
      const res = NextResponse.next()
      res.headers.set('x-tenant-subdomain', sub)
      return res
    }
    return NextResponse.next()
  }

  // Headers de sécurité communs
  const res = NextResponse.next()
  res.headers.set('x-frame-options', 'SAMEORIGIN')
  res.headers.set('x-content-type-options', 'nosniff')
  res.headers.set('referrer-policy', 'strict-origin-when-cross-origin')

  // Si on est sur un sous-domaine
  if (sub) {
    res.headers.set('x-tenant-subdomain', sub)
    
    // Synchroniser les cookies Supabase entre domaines
    const supabaseCookieNames = [
      'sb-ndlmzwwfwugtwpmebdog-auth-token',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
      'supabase-auth-token',
      'sb-auth-token',
      'cross-domain-session'
    ];
    
    console.log('🔍 Middleware - Synchronisation des cookies pour le sous-domaine:', sub);
    console.log('🔍 Tous les cookies disponibles:', Object.keys(req.cookies.getAll()));
    console.log('🔍 Détail des cookies:', req.cookies.getAll());
    
    supabaseCookieNames.forEach(cookieName => {
      const cookie = req.cookies.get(cookieName);
      if (cookie) {
        console.log('✅ Cookie trouvé:', cookieName, 'valeur:', cookie.value.substring(0, 20) + '...');
        // Cookie partagé pour TOUS les sous-domaines
        res.cookies.set(cookieName, cookie.value, {
          domain: `.${root}`,
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 jours
        });
        
        // AUSSI définir pour le domaine principal
        res.cookies.set(cookieName, cookie.value, {
          domain: root,
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 jours
        });
      } else {
        console.log('❌ Cookie non trouvé:', cookieName);
      }
    });
    
    // Chercher d'autres cookies Supabase qui pourraient exister
    const allCookies = Object.keys(req.cookies.getAll());
    const supabaseCookies = allCookies.filter(name => 
      name.includes('sb-') || 
      name.includes('supabase') || 
      name.includes('auth-token')
    );
    
    if (supabaseCookies.length > 0) {
      console.log('🔍 Cookies Supabase supplémentaires trouvés:', supabaseCookies);
      
      supabaseCookies.forEach(cookieName => {
        const cookie = req.cookies.get(cookieName);
        if (cookie) {
          console.log('✅ Synchronisation cookie supplémentaire:', cookieName);
          res.cookies.set(cookieName, cookie.value, {
            domain: `.${root}`,
            path: '/',
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 jours
          });
        }
      });
    }
    
    // Rediriger /home vers le domaine principal
    if (pathname === '/home') {
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/home`);
      return NextResponse.redirect(url);
    }
    
    // Rediriger /access-denied vers le domaine principal
    if (pathname === '/access-denied') {
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/access-denied?subdomain=${sub}`);
      return NextResponse.redirect(url);
    }
    
    // Vérifier si l'abonnement est expiré
    try {
      const dbClient = getServiceClient()
      
      const { data: tenant } = await dbClient
        .from('tenants')
        .select('id')
        .eq('subdomain', sub)
        .single()

      if (tenant) {
        const { data: subscriptionDetails } = await dbClient
          .rpc('get_subscription_details', { p_tenant_id: tenant.id })
          .single()

        if (subscriptionDetails) {
          const subscription = subscriptionDetails as {
            is_expired: boolean;
            days_until_expiration: number;
            is_expiring_soon: boolean;
            status: string;
            days_remaining: number;
            plan_name: string;
          }

          if (subscription.is_expired) {
            const mainDomain = process.env.NODE_ENV === 'production' 
              ? 'https://qgchatting.com'
              : 'http://localhost:3000';
            const url = new URL(`${mainDomain}/onboarding/subscription-renewal`);
            return NextResponse.redirect(url);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'abonnement:', error);
    }
  }

  return res
}

function extractSubdomain(host: string, rootDomain: string): string | null {
  if (!host) return null
  
  const defaultRoots = ['qgchatting.com', 'localhost:3000', 'vercel.app']
  const roots = rootDomain ? [rootDomain, ...defaultRoots] : defaultRoots
  
  const h = host.toLowerCase()
  
  for (const root of roots) {
    const rootLower = root.toLowerCase()
    if (h === rootLower || h === `www.${rootLower}`) continue
    if (h.endsWith(`.${rootLower}`)) {
      const sub = h.slice(0, -(rootLower.length + 1))
      if (sub && sub !== 'www') {
        return sub
      }
    }
  }
  
  return null
}