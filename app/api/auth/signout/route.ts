import { NextRequest, NextResponse } from 'next/server';
import { supabaseBrowser } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    // Déconnexion côté client
    const { error } = await supabaseBrowser().auth.signOut();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
