// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/tenants'

const PUBLIC_FILE = /\.(.*)$/
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up', 
  '/callback',
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
  
  // Ignore API, fichiers statiques, _next, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    PUBLIC_FILE.test(pathname)
  ) {
    // Propage le sous-domaine en header interne si présent
    const host = req.headers.get('host') ?? ''
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''
    const sub = extractSubdomain(host, root)
    if (sub) {
      const res = NextResponse.next()
      res.headers.set('x-tenant-subdomain', sub)
      return res
    }
    return NextResponse.next()
  }

  // Redirection i18n simple: "/" -> "/fr" (seulement sur le domaine principal)
  if (pathname === '/') {
    const host = req.headers.get('host') ?? ''
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''
    const sub = extractSubdomain(host, root)
    
    // Ne pas rediriger si on est sur un subdomain
    if (!sub) {
      const url = req.nextUrl.clone()
      url.pathname = '/fr'
      return NextResponse.redirect(url)
    }
  }

  // Vérifier l'abonnement pour les sous-domaines
  const host = req.headers.get('host') ?? ''
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''
  const sub = extractSubdomain(host, root)
  
  // Debug: log pour voir ce qui se passe
  console.log('Middleware debug:', { host, root, sub, pathname })
  
  if (sub) {
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
            // Vérifier le rôle de l'utilisateur pour rediriger vers la bonne page
            const userRole = req.headers.get('x-user-role') // Sera défini par l'auth
            
            if (userRole === 'owner') {
              const url = req.nextUrl.clone()
              url.pathname = '/subscription-renewal'
              return NextResponse.redirect(url)
            } else {
              const url = req.nextUrl.clone()
              url.pathname = '/subscription-expired'
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
      console.error('Erreur lors de la vérification de l\'abonnement:', error)
      // En cas d'erreur, laisser passer mais ajouter le subdomain
    }
  }

  const res = NextResponse.next()
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
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api)(.*)'],
}