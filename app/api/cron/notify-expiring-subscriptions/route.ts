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

    // 1. Trouver les abonnements qui expirent dans 3 jours
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    const { data: expiringSubscriptions, error: expiringError } = await dbClient
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
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', threeDaysFromNow.toISOString());

    if (expiringError) {
      return NextResponse.json(
        { error: "Erreur lors de la recherche des abonnements expirants" },
        { status: 500 }
      );
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      return NextResponse.json({
        message: "Aucun abonnement n'expire dans les 3 prochains jours",
        notifiedCount: 0
      });
    }

    // 2. Récupérer les propriétaires des agences concernées
    const tenantIds = expiringSubscriptions.map(sub => sub.tenant_id);
    
    const { data: owners, error: ownersError } = await dbClient
      .from('user_tenants')
      .select(`
        user_id,
        tenant_id,
        tenants!inner(
          id,
          name,
          subdomain
        )
      `)
      .in('tenant_id', tenantIds)
      .eq('is_owner', true);

    if (ownersError) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des propriétaires" },
        { status: 500 }
      );
    }

    // 3. Créer des notifications pour les propriétaires
    const notifications = owners?.map(owner => {
      const subscription = expiringSubscriptions.find(sub => sub.tenant_id === owner.tenant_id);
      const tenant = Array.isArray(owner.tenants) ? owner.tenants[0] : owner.tenants;
      
      return {
        tenant_id: owner.tenant_id,
        user_id: owner.user_id,
        type: 'subscription_expiring',
        title: 'Abonnement expire bientôt',
        message: `Votre abonnement pour l'agence ${tenant?.name} expire dans 3 jours. Pensez à le renouveler.`,
        data: {
          subscription_id: subscription?.id,
          tenant_name: tenant?.name,
          tenant_subdomain: tenant?.subdomain,
          expires_at: subscription?.current_period_end
        }
      };
    }) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await dbClient
        .from('notification')
        .insert(notifications);

      if (notificationError) {
        return NextResponse.json(
          { error: "Erreur lors de la création des notifications" },
          { status: 500 }
        );
      }
    }

    // 4. Log des abonnements expirants
    const expiringAgencies = expiringSubscriptions.map(sub => {
      const tenant = Array.isArray(sub.tenants) ? sub.tenants[0] : sub.tenants;
      return {
        subscriptionId: sub.id,
        tenantId: sub.tenant_id,
        agencyName: tenant?.name || 'Unknown',
        subdomain: tenant?.subdomain || 'Unknown',
        expiresAt: sub.current_period_end
      };
    });

    return NextResponse.json({
      message: `${expiringSubscriptions.length} abonnements expirent dans 3 jours - Notifications envoyées`,
      notifiedCount: notifications.length,
      expiringAgencies
    });

  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
