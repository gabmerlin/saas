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

  // Si on est sur un sous-domaine, gérer les redirections d'abord
  if (sub) {
    
    // Rediriger /home vers le domaine principal si accédé depuis un sous-domaine
    if (pathname === '/home') {
      // Vérifier si on est déjà en train de rediriger (cookie de protection)
      const redirectingCookie = req.cookies.get('redirecting-to-main');
      if (redirectingCookie) {
        return NextResponse.next();
      }
      
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/home`);
      
      // Créer une réponse HTML qui force la redirection côté client
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${url.toString()}">
          <script>
            window.location.replace('${url.toString()}');
          </script>
        </head>
        <body>
          <p>Redirection vers le domaine principal...</p>
        </body>
        </html>
      `;
      
      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
      
      response.cookies.set('redirecting-to-main', 'true', {
        maxAge: 5, // 5 secondes
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return response;
    }
    
    // Rediriger / vers le domaine principal si accédé depuis un sous-domaine
    if (pathname === '/') {
      // Vérifier si on est déjà en train de rediriger (cookie de protection)
      const redirectingCookie = req.cookies.get('redirecting-to-main');
      if (redirectingCookie) {
        return NextResponse.next();
      }
      
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/home`);
      
      // Créer une réponse HTML qui force la redirection côté client
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${url.toString()}">
          <script>
            window.location.replace('${url.toString()}');
          </script>
        </head>
        <body>
          <p>Redirection vers le domaine principal...</p>
        </body>
        </html>
      `;
      
      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
      
      response.cookies.set('redirecting-to-main', 'true', {
        maxAge: 5, // 5 secondes
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      return response;
    }
    
    // Rediriger /access-denied vers le domaine principal si accédé depuis un sous-domaine
    if (pathname === '/access-denied') {
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      const url = new URL(`${mainDomain}/access-denied?subdomain=${sub}`);
      return NextResponse.redirect(url);
    }
    
    // Rediriger les routes de sous-domaine vers /subdomain/*
    // MAIS exclure /, /home et /access-denied qui doivent être redirigés vers le domaine principal
    if (!pathname.startsWith('/subdomain/') && 
        pathname !== '/' && 
        pathname !== '/home' && 
        pathname !== '/access-denied') {
      const url = req.nextUrl.clone();
      url.pathname = `/subdomain${pathname}`;
      return NextResponse.rewrite(url);
    }
    
    // Si on arrive ici, c'est qu'on est sur un sous-domaine mais pas sur une route à rediriger
    // On continue avec la synchronisation des cookies
  }

  // Headers de sécurité communs
  const res = NextResponse.next()
  res.headers.set('x-frame-options', 'SAMEORIGIN')
  res.headers.set('x-content-type-options', 'nosniff')
  res.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  
  // Nettoyer le cookie de redirection si on arrive sur le domaine principal
  if (!sub && pathname === '/home') {
    res.cookies.delete('redirecting-to-main');
  }
  

  // Si on est sur un sous-domaine, synchroniser la session
  if (sub) {
    res.headers.set('x-tenant-subdomain', sub)
    
    // Synchroniser TOUS les cookies Supabase entre domaines
    // Générer dynamiquement le nom du cookie Supabase basé sur l'URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseProjectId = supabaseUrl.split('//')[1]?.split('.')[0] || 'ndlmzwwfwugtwpmebdog';
    
    console.log('🔍 MIDDLEWARE: Syncing cookies for subdomain:', sub, 'Project ID:', supabaseProjectId);
    
    const supabaseCookieNames = [
      `sb-${supabaseProjectId}-auth-token`,
      `sb-${supabaseProjectId}-auth-token.0`,
      `sb-${supabaseProjectId}-auth-token.1`,
      'supabase-auth-token',
      'sb-auth-token',
      'cross-domain-session'
    ];
    
    supabaseCookieNames.forEach(cookieName => {
      const cookie = req.cookies.get(cookieName);
      if (cookie) {
        console.log('🔍 MIDDLEWARE: Found cookie to sync:', cookieName);
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
        console.log('✅ MIDDLEWARE: Cookie synced:', cookieName);
      } else {
        console.log('🔍 MIDDLEWARE: Cookie not found:', cookieName);
      }
    });
  }

  // Vérifier si l'abonnement est expiré pour les sous-domaines
  if (sub) {
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
          res.headers.set('x-subscription-status', subscription.status)
          res.headers.set('x-subscription-expires', subscription.current_period_end)
          res.headers.set('x-subscription-expiring-soon', subscription.is_expiring_soon.toString())
        }
      }
    } catch (error) {
      // En cas d'erreur, laisser passer mais ajouter le subdomain
    }
  }

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