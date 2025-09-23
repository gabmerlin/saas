// lib/auth/process-oauth-code.ts
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Traite le code OAuth depuis l'URL et redirige vers la page appropriée
 */
export async function processOAuthCode(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      return false;
    }

    // Nettoyer l'URL IMMÉDIATEMENT pour éviter qu'elle s'affiche
    window.history.replaceState({}, document.title, '/home');

    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return false;
    }
    
    if (data.session) {
      // Rediriger vers /home
      window.location.href = '/home';
      return true;
    }
    
    return false;
    
  } catch (error) {
    return false;
  }
}
