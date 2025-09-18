import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CUSTOM_AUTH_CONFIG, generateCustomGoogleAuthUrl } from '@/lib/auth/custom-domain';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    
    // Option 1: Utiliser l'URL personnalisée (recommandé)
    if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      const customAuthUrl = generateCustomGoogleAuthUrl(redirectTo, request.nextUrl.origin);
      return NextResponse.redirect(customAuthUrl);
    }
    
    // Option 2: Utiliser Supabase avec paramètres personnalisés
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit'
      }
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile',
        redirectTo: `${request.nextUrl.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: {
          ...CUSTOM_AUTH_CONFIG.OAUTH_PARAMS,
          // Ajouter des paramètres supplémentaires pour personnaliser l'affichage
          login_hint: '', // Peut être utilisé pour suggérer un email
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.url) {
      return NextResponse.redirect(data.url);
    }

    return NextResponse.json({ error: 'URL d\'authentification non générée' }, { status: 500 });
  } catch (error) {
    console.error('Erreur lors de l\'authentification Google:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
