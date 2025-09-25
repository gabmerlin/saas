import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Déconnexion côté serveur (sans scope global pour éviter 403)
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        // Ne pas retourner d'erreur, continuer le nettoyage
      }
    } catch (supabaseError) {
      // Ignorer les erreurs Supabase, continuer le nettoyage
    }

    // Créer une réponse avec nettoyage des cookies
    const response = NextResponse.json({ success: true });
    
    // Nettoyer les cookies de session
    const cookiesToClear = [
      'sb-ndlmzwwfwugtwpmebdog-auth-token',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
      'supabase-auth-token',
      'sb-auth-token',
      'cross-domain-session'
    ];

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        domain: undefined,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });

    return response;
  } catch (error) {
    // Même en cas d'erreur, retourner un succès pour éviter les problèmes
    return NextResponse.json({ success: true });
  }
}
