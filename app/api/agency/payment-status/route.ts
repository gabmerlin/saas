import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/tenants";

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID requis' },
        { status: 400 }
      );
    }

    const dbClient = getServiceClient();

    // Récupérer les informations de l'agence et de son abonnement
    const { data: agency, error: agencyError } = await dbClient
      .from('tenants')
      .select(`
        id,
        name,
        subdomain,
        created_at,
        subscriptions!left(
          id,
          status,
          current_period_start,
          current_period_end,
          price_locked_usd,
          subscription_plans!inner(
            name,
            description
          )
        )
      `)
      .eq('id', tenantId)
      .single();

    if (agencyError || !agency) {
      return NextResponse.json(
        { error: 'Agence non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer la dernière transaction
    const { data: lastTransaction } = await dbClient
      .from('transaction')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    const agencyCreatedAt = new Date(agency.created_at);
    const daysSinceCreation = Math.floor((now.getTime() - agencyCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Déterminer le statut de paiement
    let paymentStatus = 'unknown';
    let isExpired = false;
    let daysUntilExpiration = null;
    const gracePeriodDays = 45; // 1 mois et 15 jours

    if (agency.subscriptions && agency.subscriptions.length > 0) {
      const subscription = agency.subscriptions[0];
      const periodEnd = new Date(subscription.current_period_end);
      
      if (subscription.status === 'active') {
        paymentStatus = 'paid';
        daysUntilExpiration = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiration < 0) {
          paymentStatus = 'expired';
          isExpired = true;
        }
      } else if (subscription.status === 'expired') {
        paymentStatus = 'expired';
        isExpired = true;
      } else if (subscription.status === 'cancelled') {
        paymentStatus = 'cancelled';
        isExpired = true;
      }
    } else {
      // Pas d'abonnement
      if (daysSinceCreation >= gracePeriodDays) {
        paymentStatus = 'unpaid_expired';
        isExpired = true;
      } else {
        paymentStatus = 'unpaid_grace';
        daysUntilExpiration = gracePeriodDays - daysSinceCreation;
      }
    }

    return NextResponse.json({
      ok: true,
      agency: {
        id: agency.id,
        name: agency.name,
        subdomain: agency.subdomain,
        created_at: agency.created_at,
        days_since_creation: daysSinceCreation
      },
      subscription: agency.subscriptions?.[0] || null,
      last_transaction: lastTransaction,
      payment_status: {
        status: paymentStatus,
        is_expired: isExpired,
        days_until_expiration: daysUntilExpiration,
        grace_period_days: gracePeriodDays
      }
    });

    } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut de paiement' },
      { status: 500 }
    );
  }
}
