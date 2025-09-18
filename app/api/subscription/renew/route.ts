import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/tenants";
import { z } from "zod";

const RenewSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  priceUsd: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, planId, priceUsd } = RenewSubscriptionSchema.parse(body);

    // Vérifier l'authentification
    const authHeader = request.headers.get("authorization");
    const sessionToken = request.headers.get("x-session-token");
    
    if (!authHeader && !sessionToken) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const supabase = createClient({ serviceRole: true });
    const token = authHeader?.replace("Bearer ", "") || sessionToken || "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est owner de ce tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from("user_tenants")
      .select("is_owner")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("is_owner", true)
      .single();

    if (userTenantError || !userTenant) {
      return NextResponse.json(
        { error: "Accès non autorisé - Seul le propriétaire peut renouveler l'abonnement" },
        { status: 403 }
      );
    }

    // Vérifier que le plan existe
    const { data: plan, error: planError } = await supabase
      .from("subscription_plan")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan non trouvé" },
        { status: 404 }
      );
    }

    // Créer le nouvel abonnement
    const dbClient = getServiceClient();
    const { data: newSubscriptionId, error: renewalError } = await dbClient
      .rpc('create_renewal_subscription', {
        p_tenant_id: tenantId,
        p_plan_id: planId,
        p_price_usd: priceUsd
      });

    if (renewalError) {
      return NextResponse.json(
        { error: "Erreur lors de la création du renouvellement" },
        { status: 500 }
      );
    }

    // Récupérer les détails du nouvel abonnement
    const { data: subscriptionDetails } = await dbClient
      .rpc('get_subscription_details', { p_tenant_id: tenantId })
      .single();

    return NextResponse.json({
      ok: true,
      message: "Abonnement renouvelé avec succès",
      subscription_id: newSubscriptionId,
      subscription: subscriptionDetails
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
