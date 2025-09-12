// app/api/onboarding/agency/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OwnerOnboardingAgencySchema } from "@/lib/validation/onboarding";
import { createClient } from "@supabase/supabase-js";

// Service client pour éviter les problèmes RLS
function getServiceClient<T = unknown>() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<T>(url, key, { auth: { persistSession: false } });
}

// Utilisation du service client pour éviter les problèmes RLS et cookies

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

    // Auth - Création d'un client avec la clé anonyme
    const cookieStore = await cookies();
    const dbClientUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const dbClientAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(dbClientUrl, dbClientAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Récupération du token d'auth depuis les cookies
    const rawToken = cookieStore.get('sb-ndlmzwwfwugtwpmebdog-auth-token')?.value;
    
    let authToken: string | null = null;
    
    if (rawToken) {
      try {
        // Le token est stocké comme un tableau JSON, on doit le parser
        const tokenArray = JSON.parse(rawToken);
        if (Array.isArray(tokenArray) && tokenArray.length > 0) {
          authToken = tokenArray[0];
        } else {
          authToken = rawToken;
        }
      } catch (e) {
        // Si ce n'est pas du JSON, utiliser directement
        authToken = rawToken;
      }
    }
    
    if (!authToken) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED", detail: "No auth token found" }, { status: 401 });
    }

    // Vérification de l'utilisateur avec le token
    const { data: me, error: meErr } = await supabase.auth.getUser(authToken);
    if (meErr || !me?.user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // Résoudre le tenant via le sous-domaine fourni - Utilisation du service client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbClient = getServiceClient() as any;
    const { data: tenantRow, error: tErr } = await dbClient
      .from("tenants")
      .select("id")
      .ilike("subdomain", input.subdomain)
      .single();

    if (tErr || !tenantRow) {
      return NextResponse.json({ ok: false, error: "TENANT_NOT_FOUND" }, { status: 404 });
    }
    const tenantId = (tenantRow as { id: string }).id;
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
        console.log("Capacities received:", input.capacities);
        const byOrder = new Map<number, string>();
        inserted?.forEach((r: { id: string; sort_order: number }, i: number) => {
          byOrder.set(typeof r.sort_order === "number" ? r.sort_order : i, r.id);
        });
        console.log("Shift template IDs by order:", byOrder);
        const caps = input.capacities
          .map((c) => ({
            tenant_id: tenantId,
            shift_template_id: byOrder.get(c.shiftIndex) || null,
            date: c.date ?? null,
            max_chatters: c.maxChatters,
          }))
          .filter((x) => x.shift_template_id);
        console.log("Processed capacities:", caps);
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
        created_by: me.user.id,
      }));
      const { error } = await dbClient.from("invitation").insert(rows);
      if (error) throw error;
    }

    // 11) audit_log
    await dbClient.from("audit_log").insert({
      tenant_id: tenantId,
      actor_user_id: me.user.id,
      action: "onboarding_agency_configured",
      detail: input,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "INTERNAL_ERROR" }, { status: 500 });
  }
}
