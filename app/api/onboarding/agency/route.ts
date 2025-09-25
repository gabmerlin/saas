import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OwnerOnboardingAgencySchema } from "@/lib/validators/onboarding";
import { rateLimit } from "@/lib/utils/ratelimit";

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Rate limiting
  const { ok } = await rateLimit("onboarding-agency", 10, 60);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  }

  // Authentification
  const authHeader = req.headers.get('authorization');
  const sessionToken = req.headers.get('x-session-token');
  
  let user: { id: string; email?: string } | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabase = createClient();
    const { data: { user: tokenUser }, error: userErr } = await supabase.auth.getUser(token);
    
    if (!userErr && tokenUser) {
      user = tokenUser;
    }
  } else if (sessionToken) {
    const supabase = createClient();
    const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser(sessionToken);
    
    if (!userErr && sessionUser) {
      user = sessionUser;
    }
  }
  
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // Validation du body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = OwnerOnboardingAgencySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const supabase = createClient();

  try {
    // Vérifier que l'utilisateur est propriétaire du tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", input.tenantId)
      .eq("is_owner", true)
      .single();

    if (userTenantError || !userTenant) {
      return NextResponse.json(
        { ok: false, error: "TENANT_ACCESS_DENIED" },
        { status: 403 }
      );
    }

    // Mettre à jour les paramètres de l'agence
    const { error: agencyError } = await supabase
      .from("agency_settings")
      .upsert({
        tenant_id: input.tenantId,
        name: input.agencyName,
        locale_default: input.localeDefault,
        currency_display: input.currencyDisplay,
        enforce_verified_email: input.enforceVerifiedEmail,
        suggest_2fa: input.suggest2FA,
        auto_approve_rules: input.autoApproveRules,
      });

    if (agencyError) {
      return NextResponse.json(
        { ok: false, error: "AGENCY_SETTINGS_ERROR", detail: agencyError.message },
        { status: 500 }
      );
    }

    // Créer les shifts
    if (input.shifts && input.shifts.length > 0) {
      const shiftData = input.shifts.map(shift => ({
        tenant_id: input.tenantId,
        label: shift.label,
        start_minutes: shift.startMinutes,
        end_minutes: shift.endMinutes,
        sort_order: shift.sortOrder,
      }));

      const { error: shiftsError } = await supabase
        .from("shift_template")
        .insert(shiftData);

      if (shiftsError) {
        return NextResponse.json(
          { ok: false, error: "SHIFTS_ERROR", detail: shiftsError.message },
          { status: 500 }
        );
      }
    }

    // Créer les capacités
    if (input.capacities && input.capacities.length > 0) {
      const capacityData = input.capacities.map(capacity => ({
        tenant_id: input.tenantId,
        shift_template_id: capacity.shiftIndex, // À adapter selon votre logique
        date: capacity.date,
        max_chatters: capacity.maxChatters,
      }));

      const { error: capacityError } = await supabase
        .from("shift_capacity")
        .insert(capacityData);

      if (capacityError) {
        return NextResponse.json(
          { ok: false, error: "CAPACITY_ERROR", detail: capacityError.message },
          { status: 500 }
        );
      }
    }

    // Configurer la paie
    const { error: payrollError } = await supabase
      .from("payroll_policy")
      .upsert({
        tenant_id: input.tenantId,
        hourly_enabled: input.payroll.hourlyEnabled,
        hourly_usd: input.payroll.hourlyUSD,
        revenue_share_percent: input.payroll.revenueSharePercent,
      });

    if (payrollError) {
      return NextResponse.json(
        { ok: false, error: "PAYROLL_ERROR", detail: payrollError.message },
        { status: 500 }
      );
    }

    // Configurer les strikes
    const { error: strikeError } = await supabase
      .from("strike_policy")
      .upsert({
        tenant_id: input.tenantId,
        grace_minutes: input.strike.graceMinutes,
        late_fee_usd: input.strike.lateFeeUSD,
        absence_fee_usd: input.strike.absenceFeeUSD,
        pool_top_count: input.strike.poolTopCount,
      });

    if (strikeError) {
      return NextResponse.json(
        { ok: false, error: "STRIKE_ERROR", detail: strikeError.message },
        { status: 500 }
      );
    }

    // Configurer Telegram
    const { error: telegramError } = await supabase
      .from("telegram_settings")
      .upsert({
        tenant_id: input.tenantId,
        channel_id: input.telegram.channelId,
        daily_digest: input.telegram.dailyDigest,
      });

    if (telegramError) {
      return NextResponse.json(
        { ok: false, error: "TELEGRAM_ERROR", detail: telegramError.message },
        { status: 500 }
      );
    }

    // Configurer Instagram
    const { error: instagramError } = await supabase
      .from("instagram_settings")
      .upsert({
        tenant_id: input.tenantId,
        enabled: input.instagramEnabled || input.instagramAddon,
      });

    if (instagramError) {
      return NextResponse.json(
        { ok: false, error: "INSTAGRAM_ERROR", detail: instagramError.message },
        { status: 500 }
      );
    }

    // Configurer la compétition
    const { error: competitionError } = await supabase
      .from("competition_settings")
      .upsert({
        tenant_id: input.tenantId,
        opt_in: input.competition.optIn,
        alias: input.competition.alias,
      });

    if (competitionError) {
      return NextResponse.json(
        { ok: false, error: "COMPETITION_ERROR", detail: competitionError.message },
        { status: 500 }
      );
    }

    // Ajouter les emails de facturation
    if (input.billingEmails && input.billingEmails.length > 0) {
      const billingData = input.billingEmails.map((email, index) => ({
        tenant_id: input.tenantId,
        email: email,
        is_primary: index === 0,
      }));

      const { error: billingError } = await supabase
        .from("billing_contact")
        .insert(billingData);

      if (billingError) {
        return NextResponse.json(
          { ok: false, error: "BILLING_ERROR", detail: billingError.message },
          { status: 500 }
        );
      }
    }

    // Créer les invitations
    if (input.invites && input.invites.length > 0) {
      const invitationData = input.invites.map(invite => ({
        tenant_id: input.tenantId,
        email: invite.email,
        role_key: invite.roleKey,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
        created_by: user.id,
      }));

      const { error: invitationError } = await supabase
        .from("invitation")
        .insert(invitationData);

      if (invitationError) {
        return NextResponse.json(
          { ok: false, error: "INVITATION_ERROR", detail: invitationError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Configuration de l'agence mise à jour avec succès",
    });

  } catch (error) {
    console.error("Erreur lors de la configuration de l'agence:", error);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR", detail: "Une erreur interne s'est produite" },
      { status: 500 }
    );
  }
}
