// app/api/invitations/check/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = createClient();
    
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        roles!inner(key, description),
        tenants!inner(id, name, subdomain),
        profiles!invitations_invited_by_fkey(full_name)
      `)
      .eq('token', token)
      .eq('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitation invalide ou expirée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('Error checking invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de l\'invitation' },
      { status: 500 }
    );
  }
}