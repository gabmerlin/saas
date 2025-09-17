// app/api/invitations/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createClient } from '@/lib/supabase/server';
import { acceptInvitationServer } from '@/lib/invitations/server-actions';

// POST /api/invitations/accept - Accepter une invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token d\'invitation requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur authentifié
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Rediriger vers la page d'inscription avec le token d'invitation
      return NextResponse.json(
        { 
          error: 'Utilisateur non authentifié',
          redirectTo: `/sign-up?invitation=${token}`
        },
        { status: 401 }
      );
    }
    
    // Vérifier que l'email de l'utilisateur correspond à l'invitation
    const { data: invitationCheck } = await supabase
      .from('invitation')
      .select('email, tenant_id')
      .eq('token', token)
      .single();
    
    if (!invitationCheck || invitationCheck.email !== user.email) {
      return NextResponse.json(
        { error: 'Cette invitation ne correspond pas à votre compte' },
        { status: 400 }
      );
    }
    
    const invitation = await acceptInvitationServer(token, user.id);

    return NextResponse.json({ 
      success: true, 
      tenant: invitation.tenants,
      message: 'Invitation acceptée avec succès' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'acceptation de l\'invitation' },
      { status: 500 }
    );
  }
}