// app/api/agency/status/route.ts
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

    // Récupérer les informations de l'agence
    const { data: agency, error: agencyError } = await dbClient
      .from('tenants')
      .select(`
        id,
        name,
        subdomain,
        created_at
      `)
      .eq('subdomain', subdomain)
      .single();

    if (agencyError || !agency) {
      return NextResponse.json(
        { error: 'Agence non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer les rôles de l'utilisateur connecté
    let userRoles: string[] = [];
    const authHeader = request.headers.get('authorization');
    
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        
        // Utiliser le token pour récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          // Erreur silencieuse
        } else if (user) {
          
          const { data: rolesData, error: rolesError } = await dbClient
            .from('user_roles')
            .select(`
              role_id,
              roles!inner(key)
            `)
            .eq('user_id', user.id)
            .eq('tenant_id', agency.id);
          
          console.log('🔍 Données brutes user_roles:', { rolesData, rolesError });
          
          if (rolesError) {
            console.log('❌ Erreur user_roles:', rolesError);
          } else {
            console.log('🔍 Structure des données:', rolesData);
            userRoles = rolesData?.map(ur => ur.roles?.key).filter(Boolean) || [];
            console.log('✅ Rôles extraits:', userRoles);
          }
        }
      } catch {
        // Erreur silencieuse
      }
    }

    // Vérifier le statut de l'abonnement
    const { data: subscriptionDetails } = await dbClient
      .rpc('get_subscription_details', { p_tenant_id: agency.id })
      .single();

    // Type assertion pour les détails de l'abonnement
    const subscription = subscriptionDetails as {
      subscription_id: string;
      plan_name: string;
      status: string;
      current_period_start: string;
      current_period_end: string;
      days_remaining: number;
      is_active: boolean;
      is_expiring_soon: boolean;
      is_expired: boolean;
    } | null;

    const now = new Date();
    const agencyCreatedAt = new Date(agency.created_at);
    const daysSinceCreation = Math.floor((now.getTime() - agencyCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Déterminer si l'agence est accessible
    let isPaid = false;
    let paymentStatus = 'unpaid';
    let isAccessible = false;

    if (subscription) {
      // Si abonnement actif et non expiré
      if (subscription.is_active && !subscription.is_expired) {
        isPaid = true;
        isAccessible = true;
        paymentStatus = 'paid';
      } else if (subscription.is_expired) {
        // Abonnement expiré
        paymentStatus = 'expired';
        isAccessible = false;
      } else {
        // Pas d'abonnement actif
        paymentStatus = 'no_subscription';
        isAccessible = false;
      }
    } else if (daysSinceCreation < 7) {
      // Période de grâce de 7 jours pour la création
      paymentStatus = 'grace_period';
      isAccessible = true;
    } else {
      // Pas d'abonnement et période de grâce expirée
      paymentStatus = 'unpaid_expired';
      isAccessible = false;
    }

    // Effectuer les vérifications techniques seulement si accessible
    let technicalChecks = {
      dns: true,
      ssl: true,
      server: true,
      database: true
    };

    if (isAccessible) {
      const checks = await Promise.allSettled([
        checkDNS(),
        checkSSL(),
        checkServer(),
        checkDatabase()
      ]);

      const [dnsResult, sslResult, serverResult, dbResult] = checks;
      technicalChecks = {
        dns: dnsResult.status === 'fulfilled' && dnsResult.value,
        ssl: sslResult.status === 'fulfilled' && sslResult.value,
        server: serverResult.status === 'fulfilled' && serverResult.value,
        database: dbResult.status === 'fulfilled' && dbResult.value
      };
    }

    const agencyUrl = `https://${subdomain}.qgchatting.com`;
    const allReady = isAccessible && Object.values(technicalChecks).every(value => value);

    return NextResponse.json({
      ok: true,
      ready: allReady,
      is_paid: isPaid,
      is_accessible: isAccessible,
      payment_status: paymentStatus,
      subscription: subscription ? {
        plan_name: subscription.plan_name,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        days_remaining: subscription.days_remaining,
        is_expiring_soon: subscription.is_expiring_soon,
        is_expired: subscription.is_expired
      } : null,
      status: {
        ...technicalChecks,
        agency: {
          name: agency.name,
          subdomain: agency.subdomain,
          url: agencyUrl
        },
        user_roles: userRoles
      },
      message: !isAccessible 
        ? subscription?.is_expired 
          ? 'Abonnement expiré - Renouvellement requis'
          : 'Paiement requis pour accéder à l\'agence'
        : allReady 
          ? 'Agence prête' 
          : 'Configuration en cours...'
    });

  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}

async function checkDNS(): Promise<boolean> {
  // Simuler une vérification DNS qui prend du temps
  await new Promise(resolve => setTimeout(resolve, 2000));
  return Math.random() > 0.3; // 70% de chance d'être prêt
}

async function checkSSL(): Promise<boolean> {
  // Simuler une vérification SSL qui prend du temps
  await new Promise(resolve => setTimeout(resolve, 1500));
  return Math.random() > 0.2; // 80% de chance d'être prêt
}

async function checkServer(): Promise<boolean> {
  // Simuler une vérification serveur qui prend du temps
  await new Promise(resolve => setTimeout(resolve, 1000));
  return Math.random() > 0.1; // 90% de chance d'être prêt
}

async function checkDatabase(): Promise<boolean> {
  // Simuler une vérification base de données qui prend du temps
  await new Promise(resolve => setTimeout(resolve, 800));
  return Math.random() > 0.05; // 95% de chance d'être prêt
}
