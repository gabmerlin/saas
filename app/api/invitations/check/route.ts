// app/api/invitations/check/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET /api/invitations/check - Vérifier une invitation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token d\'invitation requis' },
        { status: 400 }
      );
    }

    // Utiliser le service client pour bypasser les restrictions RLS
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient: createServiceClient } = require('@supabase/supabase-js');
    const supabase = createServiceClient(url, key, { auth: { persistSession: false } });
    
    // Vérifier si l'invitation existe
    const { data: invitations, error } = await supabase
      .from('invitation')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('accepted_at', null);
    
    const invitation = invitations && invitations.length > 0 ? invitations[0] : null;

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation invalide ou expirée' },
        { status: 404 }
      );
    }

    // Récupérer les données des relations séparément
    const [roleResult, tenantResult] = await Promise.all([
      supabase
        .from('roles')
        .select('key, description')
        .eq('key', invitation.role_key)
        .single(),
      supabase
        .from('tenants')
        .select('id, name, subdomain')
        .eq('id', invitation.tenant_id)
        .single()
    ]);

    const invitationWithRelations = {
      ...invitation,
      role: roleResult.data,
      tenant: tenantResult.data
    };

    return NextResponse.json({ invitation: invitationWithRelations });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de l\'invitation' },
      { status: 500 }
    );
  }
}