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
    const cutoffDate = new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000)); // 45 jours = 1 mois et 15 jours


    // 1. Trouver toutes les agences créées avant la date limite
    const { data: oldAgencies, error: oldAgenciesError } = await dbClient
      .from('tenants')
      .select(`
        id,
        name,
        subdomain,
        created_at
      `)
      .lt('created_at', cutoffDate.toISOString());

    if (oldAgenciesError) {
      return NextResponse.json(
        { error: "Erreur lors de la recherche" },
        { status: 500 }
      );
    }

    if (!oldAgencies || oldAgencies.length === 0) {
      return NextResponse.json({
        message: "Aucune agence ancienne trouvée",
        deletedCount: 0
      });
    }

    // 2. Vérifier quelles agences ont des abonnements actifs
    const agencyIds = oldAgencies.map(agency => agency.id);
    
    const { data: activeSubscriptions, error: subscriptionsError } = await dbClient
      .from('subscription')
      .select('tenant_id')
      .in('tenant_id', agencyIds)
      .eq('status', 'active');

    if (subscriptionsError) {
      return NextResponse.json(
        { error: "Erreur lors de la vérification des abonnements" },
        { status: 500 }
      );
    }

    // 3. Filtrer les agences sans abonnement actif
    const activeTenantIds = new Set(activeSubscriptions?.map(sub => sub.tenant_id) || []);
    const agenciesToDelete = oldAgencies.filter(agency => !activeTenantIds.has(agency.id));


    if (agenciesToDelete.length === 0) {
      return NextResponse.json({
        message: "Aucune agence à supprimer",
        deletedCount: 0
      });
    }

    // 3. Supprimer les agences (cascade supprimera les données associées)
    const agenciesToDeleteIds = agenciesToDelete.map(agency => agency.id);
    
    const { error: deleteError } = await dbClient
      .from('tenants')
      .delete()
      .in('id', agenciesToDeleteIds);

    if (deleteError) {
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    // 4. Log des agences supprimées
    const deletedAgencies = agenciesToDelete.map(agency => ({
      id: agency.id,
      name: agency.name,
      subdomain: agency.subdomain,
      created_at: agency.created_at
    }));


    return NextResponse.json({
      message: `${agenciesToDelete.length} agences supprimées`,
      deletedCount: agenciesToDelete.length,
      deletedAgencies
    });

  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
