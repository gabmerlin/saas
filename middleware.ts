// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/tenants'

const PUBLIC_FILE = /\.(.*)$/
const PUBLIC_PATHS = [
  '/auth/sign-in',
  '/auth/sign-up', 
  '/auth/callback',
  '/auth/verify-email',
  '/auth/reset-password',
  '/invitations/accept',
  '/debug-auth',
  '/subscription-expired',
  '/subscription-renewal',
]

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

  // Si on est sur un sous-domaine, synchroniser la session
  if (sub) {
    res.headers.set('x-tenant-subdomain', sub)
    
    // Synchroniser TOUS les cookies Supabase entre domaines
    const supabaseCookieNames = [
      'sb-ndlmzwwfwugtwpmebdog-auth-token',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
      'supabase-auth-token',
      'sb-auth-token',
      'cross-domain-session'
    ];
    
    // Vérifier si on a des cookies d'auth sur le sous-domaine
    const hasAuthCookie = supabaseCookieNames.some(name => req.cookies.get(name));
    
    if (!hasAuthCookie) {
      // Pas de cookies d'auth, rediriger vers le domaine principal pour les récupérer
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/subdomain/dashboard?subdomain=${sub}`);
      return NextResponse.redirect(url);
    }
    
    supabaseCookieNames.forEach(cookieName => {
      const cookie = req.cookies.get(cookieName);
      if (cookie) {
        // Cookie partagé pour TOUS les sous-domaines
        res.cookies.set(cookieName, cookie.value, {
          domain: `.${root}`,
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 jours
        });
        
        // AUSSI synchroniser avec le domaine principal
        res.cookies.set(cookieName, cookie.value, {
          domain: root,
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7 // 7 jours
        });
      }
    });
  }
  
  if (sub) {
    // Rediriger /home vers le domaine principal si accédé depuis un sous-domaine
    if (pathname === '/home') {
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/home`);
      return NextResponse.redirect(url);
    }
    
    // Rediriger /access-denied vers le domaine principal si accédé depuis un sous-domaine
    if (pathname === '/access-denied') {
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/access-denied?subdomain=${sub}`);
      return NextResponse.redirect(url);
    }
    
    // Rediriger /dashboard vers /subdomain/dashboard si accédé depuis un sous-domaine
    if (pathname === '/dashboard') {
      const url = new URL(req.url);
      url.pathname = '/subdomain/dashboard';
      return NextResponse.redirect(url);
    }
    
    // Vérifier si l'abonnement est expiré
    try {
      const dbClient = getServiceClient()
      
      // D'abord récupérer l'ID du tenant par subdomain
      const { data: tenant } = await dbClient
        .from('tenants')
        .select('id')
        .eq('subdomain', sub)
        .single()

      if (tenant) {
        // Récupérer les détails de l'abonnement
        const { data: subscriptionDetails } = await dbClient
          .rpc('get_subscription_details', { p_tenant_id: tenant.id })
          .single()

        if (subscriptionDetails) {
          // Type assertion pour les détails de l'abonnement
          const subscription = subscriptionDetails as {
            is_expired: boolean;
            days_until_expiration: number;
            is_expiring_soon: boolean;
            status: string;
            days_remaining: number;
            plan_name: string;
          }

          // Si l'abonnement est expiré, rediriger vers la page de renouvellement
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
      // En cas d'erreur, continuer normalement
      console.error('Erreur lors de la vérification de l\'abonnement:', error);
    }
  }

  if (sub) res.headers.set('x-tenant-subdomain', sub)
  return res
}

function extractSubdomain(host: string, rootDomain: string): string | null {
  if (!host) return null
  
  // Si pas de rootDomain défini, utiliser des domaines par défaut
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