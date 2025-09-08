// app/api/onboarding/check-subdomain/route.ts
import { NextResponse } from "next/server";
import { SubdomainSchema } from "@/lib/validation/onboarding";
import { getServiceClient } from "@/lib/tenants";
import { rateLimit } from "@/lib/utils/ratelimit";

export async function GET(req: Request) {
  const { ok } = await rateLimit("check-subdomain", 20, 60);
  if (!ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

  const url = new URL(req.url);
  const subdomain = (url.searchParams.get("subdomain") || "").toLowerCase();

  const parsed = SubdomainSchema.safeParse({ subdomain });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_SUBDOMAIN", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: tExists } = await supabase.from("tenants").select("id").eq("subdomain", subdomain).maybeSingle();
  if (tExists) return NextResponse.json({ ok: false, reason: "SUBDOMAIN_TAKEN" });

  const full = `${subdomain}.${process.env.ROOT_DOMAIN!}`;
  const { data: rpc } = await supabase.rpc("is_domain_available", { p_domain: full });
  if (rpc === false) return NextResponse.json({ ok: false, reason: "DOMAIN_TAKEN" });

  return NextResponse.json({ ok: true, reason: "AVAILABLE" });
}
