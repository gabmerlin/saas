import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/tenants';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain requis' },
        { status: 400 }
      );
    }

    const dbClient = getServiceClient();

    // Récupérer l'ID du tenant par subdomain
    const { data: tenant, error: tenantError } = await dbClient
      .from('tenants')
      .select('id, name, subdomain')
      .eq('subdomain', subdomain)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Agence non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les détails de l'abonnement
    const { data: subscriptionDetails, error: subscriptionError } = await dbClient
      .rpc('get_subscription_details', { p_tenant_id: tenant.id })
      .single();

    if (subscriptionError) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'abonnement' },
        { status: 500 }
      );
    }

    if (!subscriptionDetails) {
      return NextResponse.json(
        { error: 'Aucun abonnement trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      tenant_subdomain: tenant.subdomain,
      subscription: subscriptionDetails
    });

  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de l\'abonnement' },
      { status: 500 }
    );
  }
}
