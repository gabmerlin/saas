// app/api/onboarding/agency/route.ts
import { NextResponse } from "next/server";
import { OwnerOnboardingAgencySchema } from "@/lib/validation/onboarding";
import { createClient, createClientWithSession } from "@/lib/supabase/server";

// Service client pour éviter les problèmes RLS
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Utiliser le service client avec les permissions de service role
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createServiceClient } = require('@supabase/supabase-js');
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const parsed = OwnerOnboardingAgencySchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PAYLOAD", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // Auth - Vérification via les headers de la requête
    const authHeader = req.headers.get('authorization');
    const sessionToken = req.headers.get('x-session-token');
    
    let user: { id: string; email?: string } | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Utilisation du token Bearer
      const token = authHeader.substring(7);
      const supabase = createClient();
      const { data: { user: tokenUser }, error: userErr } = await supabase.auth.getUser(token);
      
      if (!userErr && tokenUser) {
        user = tokenUser;
      }
    } else if (sessionToken) {
      // Utilisation du token de session
      const supabase = createClient();
      const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser(sessionToken);
      
      if (!userErr && sessionUser) {
        user = sessionUser;
      }
    } else {
      // Fallback: essayer avec les cookies
      const supabase = await createClientWithSession();
      const { data: { user: cookieUser }, error: userErr } = await supabase.auth.getUser();
      
      if (!userErr && cookieUser) {
        user = cookieUser;
      }
    }
    
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED", detail: "No valid authentication found" }, { status: 401 });
    }

    // Utiliser l'ID du tenant directement si fourni, sinon chercher par sous-domaine
    // Utilisation du service client pour les opérations DB (bypass RLS)
    const dbClient = getServiceClient();
    
    console.log('Agency API - Input received:', { 
      tenantId: input.tenantId, 
      subdomain: input.subdomain,
      hasTenantId: !!input.tenantId 
    });
    
    let tenantId: string;
    
    // Vérifier si l'ID du tenant est fourni directement
    if (input.tenantId) {
      console.log('Using provided tenantId:', input.tenantId);
      tenantId = input.tenantId;
    } else {
      // Fallback: chercher par sous-domaine
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { data: tenantRow, error: tErr } = await dbClient
        .from("tenants")
        .select("id")
        .ilike("subdomain", input.subdomain)
        .single();

      if (tErr || !tenantRow) {
        console.error('Tenant not found for subdomain:', input.subdomain, 'Error:', tErr);
        return NextResponse.json({ ok: false, error: "TENANT_NOT_FOUND" }, { status: 404 });
      }
      tenantId = (tenantRow as { id: string }).id;
    }
    const now = new Date().toISOString();

    // 1) agency_settings
    {
      const { error } = await dbClient.from("agency_settings").upsert(
        {
          tenant_id: tenantId,
          name: input.agencyName,
          locale_default: input.localeDefault,
          currency_display: input.currencyDisplay,
          enforce_verified_email: input.enforceVerifiedEmail,
          suggest_2fa: input.suggest2FA,
          auto_approve_rules: input.autoApproveRules,
          updated_at: now,
        },
        { onConflict: "tenant_id" }
      );
      if (error) throw error;
    }

    // 2) thème dans tenants.theme (jsonb)
    {
      const theme = { preset: input.themePreset, tokens: input.themeTokens, updated_at: now };
      const { error } = await dbClient.from("tenants").update({ theme }).eq("id", tenantId);
      if (error) throw error;
    }

    // 3) shifts : reset + insert
    {
      const { error: delErr } = await dbClient.from("shift_template").delete().eq("tenant_id", tenantId);
      if (delErr) throw delErr;

      const rows = input.shifts.map((s) => ({
        tenant_id: tenantId,
        label: s.label,
        start_minutes: s.startMinutes,
        end_minutes: s.endMinutes,
        sort_order: s.sortOrder,
      }));
      const { data: inserted, error: insErr } = await dbClient
        .from("shift_template")
        .insert(rows)
        .select("id, sort_order");
      if (insErr) throw insErr;

      if (input.capacities?.length) {
        const byOrder = new Map<number, string>();
        inserted?.forEach((r: { id: string; sort_order: number }, i: number) => {
          byOrder.set(typeof r.sort_order === "number" ? r.sort_order : i, r.id);
        });
        const caps = input.capacities
          .map((c) => ({
            tenant_id: tenantId,
            shift_template_id: byOrder.get(c.shiftIndex) || null,
            date: c.date ?? null,
            max_chatters: c.maxChatters,
          }))
          .filter((x) => x.shift_template_id);
        if (caps.length) {
          const { error: capErr } = await dbClient.from("shift_capacity").insert(caps);
          if (capErr) throw capErr;
        }
      }
    }

    // 4) payroll_policy
    {
      const { error } = await dbClient.from("payroll_policy").upsert(
        {
          tenant_id: tenantId,
          hourly_enabled: input.payroll.hourlyEnabled,
          hourly_usd: input.payroll.hourlyEnabled ? (input.payroll.hourlyUSD ?? null) : null,
          revenue_share_percent: input.payroll.revenueSharePercent,
        },
        { onConflict: "tenant_id" }
      );
      if (error) throw error;
    }

    // 5) strike_policy
    {
      const { error } = await dbClient.from("strike_policy").upsert(
        {
          tenant_id: tenantId,
          grace_minutes: input.strike.graceMinutes,
          late_fee_usd: input.strike.lateFeeUSD,
          absence_fee_usd: input.strike.absenceFeeUSD,
          pool_top_count: input.strike.poolTopCount,
        },
        { onConflict: "tenant_id" }
      );
      if (error) throw error;
    }

    // 6) billing_contact (replace)
    {
      const { error: del } = await dbClient.from("billing_contact").delete().eq("tenant_id", tenantId);
      if (del) throw del;
      const contacts = input.billingEmails.map((email, i) => ({
        tenant_id: tenantId,
        email,
        is_primary: i === 0,
      }));
      if (contacts.length) {
        const { error } = await dbClient.from("billing_contact").insert(contacts);
        if (error) throw error;
      }
    }

    // 7) telegram_settings
    {
      const { error } = await dbClient.from("telegram_settings").upsert(
        {
          tenant_id: tenantId,
          channel_id: input.telegram.channelId || null,
          daily_digest: input.telegram.dailyDigest,
        },
        { onConflict: "tenant_id" }
      );
      if (error) throw error;
    }

    // 8) competition_settings
    {
      const { error } = await dbClient.from("competition_settings").upsert(
        {
          tenant_id: tenantId,
          opt_in: input.competition.optIn,
          alias: input.competition.alias || null,
        },
        { onConflict: "tenant_id" }
      );
      if (error) throw error;
    }

    // 9) instagram_settings (switch)
    {
      const { error } = await dbClient.from("instagram_settings").upsert(
        {
          tenant_id: tenantId,
          enabled: input.instagramEnabled || input.instagramAddon,
        },
        { onConflict: "tenant_id" }
      );
      if (error) throw error;
    }

    // 10) invitations (expire à 00:00 UTC)
    if (input.invites?.length) {
      const midnightUTC = new Date();
      midnightUTC.setUTCHours(24, 0, 0, 0);
      const expiresAt = midnightUTC.toISOString();
      const rows = input.invites.map((i) => ({
        tenant_id: tenantId,
        email: i.email ?? null,
        role_key: i.roleKey,
        token: crypto.randomUUID(),
        expires_at: expiresAt,
        created_by: user.id,
      }));
      const { error } = await dbClient.from("invitation").insert(rows);
      if (error) throw error;
    }

    // 11) audit_log
    await dbClient.from("audit_log").insert({
      tenant_id: tenantId,
      actor_user_id: user.id,
      action: "onboarding_agency_configured",
      detail: input,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "INTERNAL_ERROR" }, { status: 500 });
  }
}
