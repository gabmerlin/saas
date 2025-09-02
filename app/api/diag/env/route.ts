// app/api/diag/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pick = (v?: string) => (v ? true : false);
  const mask = (v?: string) => (v ? v.slice(0, 6) + "…" : null);

  return NextResponse.json({
    ok: true,
    env: {
      PRIMARY_ZONE: pick(process.env.PRIMARY_ZONE),
      DOMAIN_PROVISIONING_SECRET: pick(process.env.DOMAIN_PROVISIONING_SECRET),
      VERCEL_PROJECT_ID: pick(process.env.VERCEL_PROJECT_ID),
      VERCEL_TOKEN: pick(process.env.VERCEL_TOKEN),
      OVH_API_ENDPOINT: process.env.OVH_API_ENDPOINT ?? null,
      OVH_APP_KEY: mask(process.env.OVH_APP_KEY),
      OVH_APP_SECRET: !!process.env.OVH_APP_SECRET,
      OVH_CONSUMER_KEY: mask(process.env.OVH_CONSUMER_KEY),
    },
  });
}
