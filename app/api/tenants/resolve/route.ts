// app/api/tenant/resolve/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''
  const sub = extractSubdomain(host, root)
  return NextResponse.json({
    ok: true,
    tenant: sub,
    reason: sub ? 'has-subdomain' : 'no-subdomain',
  })
}

function extractSubdomain(host: string, rootDomain: string): string | null {
  if (!host || !rootDomain) return null
  const h = host.toLowerCase()
  const r = rootDomain.toLowerCase()
  if (h === r || h === `www.${r}`) return null
  return h.endsWith(`.${r}`) ? h.slice(0, -(r.length + 1)) : null
}
