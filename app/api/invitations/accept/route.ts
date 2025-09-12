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

    // Pour l'instant, on ne peut pas récupérer l'userId facilement ici
    // Il faudrait modifier la logique d'authentification
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }
    
    const invitation = await acceptInvitationServer(token, user.id);

    return NextResponse.json({ 
      success: true, 
      tenant: invitation.tenants,
      message: 'Invitation acceptée avec succès' 
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de l\'acceptation de l\'invitation' },
      { status: 500 }
    );
  }
}