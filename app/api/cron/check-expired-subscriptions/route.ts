import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/tenants";

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Vérifier que c'est un appel cron autorisé
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const dbClient = getServiceClient();
    const now = new Date();

    console.log(`[SUBSCRIPTION CHECK] Vérification des abonnements expirés`);

    // 1. Marquer les abonnements expirés
    const { data: expiredSubscriptions, error: expiredError } = await dbClient
      .from('subscription')
      .select(`
        id,
        tenant_id,
        status,
        current_period_end,
        tenants!inner(
          id,
          name,
          subdomain
        )
      `)
      .eq('status', 'active')
      .lt('current_period_end', now.toISOString());

    if (expiredError) {
      console.error('[SUBSCRIPTION CHECK] Erreur lors de la recherche des abonnements expirés:', expiredError);
      return NextResponse.json(
        { error: "Erreur lors de la recherche" },
        { status: 500 }
      );
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      return NextResponse.json({
        message: "Aucun abonnement expiré",
        updatedCount: 0
      });
    }

    // 2. Marquer les abonnements comme expirés
    const subscriptionIds = expiredSubscriptions.map(sub => sub.id);
    
    const { error: updateError } = await dbClient
      .from('subscription')
      .update({ 
        status: 'expired',
        updated_at: now.toISOString()
      })
      .in('id', subscriptionIds);

    if (updateError) {
      console.error('[SUBSCRIPTION CHECK] Erreur lors de la mise à jour:', updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    // 3. Log des abonnements expirés
    const expiredAgencies = expiredSubscriptions.map(sub => {
      const tenant = Array.isArray(sub.tenants) ? sub.tenants[0] : sub.tenants;
      return {
        subscriptionId: sub.id,
        tenantId: sub.tenant_id,
        agencyName: tenant?.name || 'Unknown',
        subdomain: tenant?.subdomain || 'Unknown',
        expiredAt: sub.current_period_end
      };
    });

    console.log('[SUBSCRIPTION CHECK] Abonnements expirés:', expiredAgencies);

    return NextResponse.json({
      message: `${expiredSubscriptions.length} abonnements marqués comme expirés`,
      updatedCount: expiredSubscriptions.length,
      expiredAgencies
    });

  } catch (error) {
    console.error('[SUBSCRIPTION CHECK] Erreur inattendue:', error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
