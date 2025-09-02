// app/api/diag/env/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type FlagMap = Record<string, boolean | string>

export async function GET() {
  const flags: FlagMap = {
    PRIMARY_ZONE: !!process.env.PRIMARY_ZONE,
    DOMAIN_PROVISIONING_SECRET: !!process.env.DOMAIN_PROVISIONING_SECRET,
    VERCEL_PROJECT_ID: !!process.env.VERCEL_PROJECT_ID,
    VERCEL_TOKEN: !!process.env.VERCEL_TOKEN,
    OVH_API_ENDPOINT: process.env.OVH_API_ENDPOINT ?? '',
    OVH_APP_KEY: mask(process.env.OVH_APP_KEY),
    OVH_APP_SECRET: mask(process.env.OVH_APP_SECRET),
    OVH_CONSUMER_KEY: mask(process.env.OVH_CONSUMER_KEY),
  }
  return NextResponse.json({ ok: true, env: flags })
}

function mask(v?: string): string {
  if (!v) return ''
  if (v.length <= 6) return '******'
  return `${v.slice(0, 6)}…`
}
