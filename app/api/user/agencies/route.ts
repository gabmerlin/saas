import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';

// GET /api/user/agencies - Récupérer les agences de l'utilisateur connecté
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Récupérer la session utilisateur
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer les agences de l'utilisateur
    const { data: userAgencies, error: agenciesError } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        is_owner,
        tenants (
          id,
          name,
          subdomain,
          created_at
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (agenciesError) {
      console.error('Erreur lors de la récupération des agences:', agenciesError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des agences' },
        { status: 500 }
      );
    }

    // Formater les données
    const agencies = userAgencies?.map((ua: any) => ({
      id: ua.tenants.id,
      name: ua.tenants.name,
      subdomain: ua.tenants.subdomain,
      isOwner: ua.is_owner,
      createdAt: ua.tenants.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      agencies
    });

  } catch (error) {
    console.error('Erreur dans /api/user/agencies:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
