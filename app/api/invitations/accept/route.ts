// app/api/invitations/accept/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { acceptInvitation } from '@/lib/invitations/actions';

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

    const invitation = await acceptInvitation(token);

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