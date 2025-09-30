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
    
    // Si pas de cookies d'auth sur le sous-domaine ET qu'on accède au dashboard, rediriger vers le domaine principal
    const hasAuthCookie = supabaseCookieNames.some(name => req.cookies.get(name));
    if (!hasAuthCookie && (pathname === '/dashboard' || pathname === '/subdomain/dashboard')) {
      // Rediriger vers le domaine principal pour récupérer la session
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/subdomain/dashboard?subdomain=${sub}`);
      return NextResponse.redirect(url);
    }
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
    
    // Vérifier l'authentification et l'appartenance à l'agence
    // Cette vérification se fait côté client dans le layout, mais on peut ajouter une vérification basique ici
    // pour éviter les accès non autorisés au niveau du serveur
    
    // Ne pas rediriger automatiquement - laisser les pages gérer leur propre logique
    // Les pages peuvent décider si elles veulent rediriger ou afficher du contenu
    
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
            subscription_id: string;
            plan_name: string;
            status: string;
            current_period_start: string;
            current_period_end: string;
            days_remaining: number;
            is_active: boolean;
            is_expiring_soon: boolean;
            is_expired: boolean;
          };

          // Si l'abonnement est expiré, rediriger vers la page appropriée
          if (subscription.is_expired) {
            // Ne pas rediriger si on est déjà sur une page d'expiration
            if (pathname === '/onboarding/subscription-expired' || pathname === '/onboarding/subscription-renewal') {
              // Laisser passer sans redirection
            } else {
              // Rediriger vers subscription-renewal par défaut
              // La page subscription-renewal vérifiera si l'utilisateur est owner
              // et redirigera vers subscription-expired si ce n'est pas le cas
              const url = req.nextUrl.clone()
              url.pathname = '/onboarding/subscription-renewal'
              return NextResponse.redirect(url)
            }
          }
          
          // Ajouter les informations d'abonnement aux headers
          const res = NextResponse.next()
          res.headers.set('x-tenant-subdomain', sub)
          res.headers.set('x-subscription-status', subscription.status)
          res.headers.set('x-subscription-expires', subscription.current_period_end)
          res.headers.set('x-subscription-expiring-soon', subscription.is_expiring_soon.toString())
          return res
        }
      }
    } catch (error) {
      // En cas d'erreur, laisser passer mais ajouter le subdomain
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}