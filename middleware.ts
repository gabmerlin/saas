// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PUBLIC_FILE = /\.(.*)$/
const PUBLIC_PATHS = [
  '/auth/sign-in',
  '/auth/sign-up', 
  '/auth/callback',
  '/auth/verify-email',
  '/auth/reset-password',
  '/invitations/accept',
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

  // Redirection i18n simple: "/" -> "/fr"
  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/fr'
    return NextResponse.redirect(url)
  }

  // Vérifier l'authentification pour les pages protégées
  if (!PUBLIC_PATHS.includes(pathname)) {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/sign-in'
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
      }

      // Vérifier si l'email est vérifié
      if (!user.email_confirmed_at) {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/verify-email'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Auth middleware error:', error)
      const url = req.nextUrl.clone()
      url.pathname = '/auth/sign-in'
      return NextResponse.redirect(url)
    }
  }

  // Ajoute le header tenant pour le reste des pages
  const host = req.headers.get('host') ?? ''
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''
  const sub = extractSubdomain(host, root)
  const res = NextResponse.next()
  if (sub) res.headers.set('x-tenant-subdomain', sub)
  return res
}

function extractSubdomain(host: string, rootDomain: string): string | null {
  if (!host || !rootDomain) return null
  const h = host.toLowerCase()
  const root = rootDomain.toLowerCase()
  if (h === root || h === `www.${root}`) return null
  if (h.endsWith(`.${root}`)) {
    const sub = h.slice(0, -(root.length + 1))
    return sub || null
  }
  return null
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api)(.*)'],
}
