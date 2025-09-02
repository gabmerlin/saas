// app/api/tenants/domains/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'

export const runtime = 'nodejs'

type Jsonish = Record<string, unknown>

const VERCEL_API = 'https://api.vercel.com'
const VERCEL_VERSION = 'v10'

const OVH_ENDPOINT = process.env.OVH_API_ENDPOINT ?? 'https://eu.api.ovh.com/1.0'
const ROOT_ZONE =
  process.env.PRIMARY_ZONE ?? process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? ''

/* ---------------------------- validation ---------------------------- */

const Body = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    // commence/termine par alphanum, tiret permis au milieu
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u, 'format invalide')
    .refine((s) => s !== 'www', { message: 'subdomain réservé' }),
})

/* ------------------------------ GET -------------------------------- */

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'Use POST' })
}

/* ------------------------------ POST ------------------------------- */

export async function POST(req: NextRequest) {
  try {
    // Auth simple
    const secret = req.headers.get('x-provisioning-secret') ?? ''
    if (!secret || secret !== (process.env.DOMAIN_PROVISIONING_SECRET ?? '')) {
      return jsonError(401, 'Unauthorized: missing/invalid x-provisioning-secret')
    }
    if (!ROOT_ZONE) return jsonError(500, 'PRIMARY_ZONE / ROOT_DOMAIN not set')

    const parsed = Body.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(', ')
      return jsonError(400, `Invalid payload: ${msg}`)
    }
    const sub = parsed.data.subdomain
    const fqdn = `${sub}.${ROOT_ZONE}`

    // 1) Vercel: add domain (idempotent)
    const { VERCEL_PROJECT_ID, VERCEL_TOKEN } = process.env
    if (!VERCEL_PROJECT_ID || !VERCEL_TOKEN) {
      return jsonError(500, 'VERCEL_PROJECT_ID / VERCEL_TOKEN not set')
    }

    const vAdd = await fetch(
      `${VERCEL_API}/${VERCEL_VERSION}/projects/${encodeURIComponent(
        VERCEL_PROJECT_ID,
      )}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: fqdn }),
      },
    )

    if (!vAdd.ok) {
      if (vAdd.status === 409) {
        const e = (await vAdd.json().catch(() => ({}))) as Jsonish
        const code = (e?.error as Jsonish)?.code
        const pid = (e?.error as Jsonish)?.projectId
        if (code !== 'domain_already_in_use' || pid !== VERCEL_PROJECT_ID) {
          return jsonError(400, `Vercel add domain failed: ${vAdd.status} ${JSON.stringify(e)}`)
        }
      } else {
        const e = await vAdd.text()
        return jsonError(400, `Vercel add domain failed: ${vAdd.status} ${e}`)
      }
    }

    // 2) OVH: si un wildcard *.racine -> cname.vercel-dns.com existe,
    // on peut sauter la création du CNAME dédié.
    const hasWildcard = await ovhHasGoodWildcard()

    let createdId: number | null = null
    if (!hasWildcard) {
      // Maintenir/Créer CNAME sub -> cname.vercel-dns.com.
      const existingIds = await ovhListRecordsBySub('CNAME', sub)

      let hasGoodCname = false
      for (const id of existingIds) {
        const rec = await ovhGetRecord(id)
        if (rec.fieldType !== 'CNAME') {
          await ovhDeleteRecord(id)
          continue
        }
        if (!isGoodTarget(rec.target)) {
          await ovhUpdateRecord(id, { target: 'cname.vercel-dns.com.', ttl: 60 })
        } else {
          hasGoodCname = true
        }
      }

      if (!hasGoodCname && existingIds.length === 0) {
        createdId = await ovhCreateRecord({
          fieldType: 'CNAME',
          subDomain: sub,
          target: 'cname.vercel-dns.com.',
          ttl: 60,
        })
      }

      await ovhRefreshZone()
    }

    return NextResponse.json({
      ok: true,
      domain: fqdn,
      usedWildcard: hasWildcard,
      ovhRecordId: createdId,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonError(500, `Server error: ${msg}`)
  }
}

/* --------------------------- helpers --------------------------- */

function isGoodTarget(target: string): boolean {
  const t = target.trim().toLowerCase()
  return t === 'cname.vercel-dns.com' || t === 'cname.vercel-dns.com.'
}

function jsonError(code: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: code })
}

/* --------------------------- OVH client --------------------------- */

type OvhRecord = {
  id: number
  fieldType: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'SRV' | string
  subDomain: string
  target: string
  ttl: number
  zone: string
}

type OvhCreateBody = {
  fieldType: 'CNAME'
  subDomain: string
  target: string
  ttl: number
}

type OvhUpdateBody = {
  target?: string
  ttl?: number
}

function ovhClientFromEnv() {
  const AK = process.env.OVH_APP_KEY ?? ''
  const AS = process.env.OVH_APP_SECRET ?? ''
  const CK = process.env.OVH_CONSUMER_KEY ?? ''
  if (!AK || !AS || !CK) {
    throw new Error('OVH_APP_KEY / OVH_APP_SECRET / OVH_CONSUMER_KEY not set')
  }
  return { AK, AS, CK }
}

async function ovhTime(): Promise<number> {
  const r = await fetch(`${OVH_ENDPOINT}/auth/time`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`OVH time failed: ${r.status}`)
  return r.json()
}

async function ovhSignedFetch(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  bodyObj?: Jsonish | string,
) {
  const { AK, AS, CK } = ovhClientFromEnv()
  const url = `${OVH_ENDPOINT}${path}`
  const time = await ovhTime()
  const body =
    typeof bodyObj === 'string' ? bodyObj : bodyObj ? JSON.stringify(bodyObj) : ''

  const toSign = `${AS}+${CK}+${method}+${url}+${body}+${time}`
  const sig = '$1$' + createHash('sha1').update(Buffer.from(toSign, 'utf8')).digest('hex')

  const res = await fetch(url, {
    method,
    headers: {
      'X-Ovh-Application': AK,
      'X-Ovh-Consumer': CK,
      'X-Ovh-Timestamp': String(time),
      'X-Ovh-Signature': sig,
      'Content-Type': 'application/json',
    },
    body: body || undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OVH ${method} ${path} -> ${res.status} ${text}`)
  }
  const ct = res.headers.get('content-type') ?? ''
  return ct.includes('application/json') ? res.json() : null
}

async function ovhListRecordsBySub(fieldType: 'CNAME', subDomain: string): Promise<number[]> {
  const path = `/domain/zone/${encodeURIComponent(
    ROOT_ZONE,
  )}/record?fieldType=${fieldType}&subDomain=${encodeURIComponent(subDomain)}`
  const ids = (await ovhSignedFetch('GET', path)) as number[]
  return Array.isArray(ids) ? ids : []
}

async function ovhGetRecord(id: number): Promise<OvhRecord> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`
  return (await ovhSignedFetch('GET', path)) as OvhRecord
}

async function ovhDeleteRecord(id: number): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`
  await ovhSignedFetch('DELETE', path)
}

async function ovhUpdateRecord(id: number, body: OvhUpdateBody): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record/${id}`
  await ovhSignedFetch('PUT', path, body)
}

async function ovhCreateRecord(body: OvhCreateBody): Promise<number> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/record`
  const id = (await ovhSignedFetch('POST', path, body)) as number
  return id
}

async function ovhRefreshZone(): Promise<void> {
  const path = `/domain/zone/${encodeURIComponent(ROOT_ZONE)}/refresh`
  await ovhSignedFetch('POST', path, {})
}

async function ovhHasGoodWildcard(): Promise<boolean> {
  // Présence de *.root en CNAME vers Vercel ?
  const ids = await ovhListRecordsBySub('CNAME', '*')
  for (const id of ids) {
    const rec = await ovhGetRecord(id)
    if (rec.fieldType === 'CNAME' && isGoodTarget(rec.target)) return true
  }
  return false
}
