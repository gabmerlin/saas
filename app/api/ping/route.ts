// app/api/ping/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/ping', method: 'GET' })
}

export async function POST(req: NextRequest) {
  const data = (await req.json().catch(() => ({}))) as Record<string, unknown>
  return NextResponse.json({
    ok: true,
    route: '/api/ping',
    method: 'POST',
    received: data,
  })
}
