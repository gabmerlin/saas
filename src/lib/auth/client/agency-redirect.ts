'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Redirige vers le dashboard d'une agence
 */
export async function redirectToAgencyDashboard(subdomain: string): Promise<void> {
  if (!subdomain || typeof window === 'undefined') {
    return;
  }

  // Vérifier d'abord si l'agence existe
  try {
    const response = await fetch(`/api/agency/status?subdomain=${subdomain}`);
    
    // Vérifier le status HTTP et la réponse
    if (!response.ok || response.status === 404) {
      // L'agence n'existe pas, rediriger vers la page d'accès refusé
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      window.location.href = `${mainDomain}/access-denied?subdomain=${subdomain}&reason=not_found`;
      return;
    }
    
    const data = await response.json();
    
    if (!data.ok || !data.status?.agency) {
      // L'agence n'existe pas, rediriger vers la page d'accès refusé
      const mainDomain = process.env.NODE_ENV === 'production' 
        ? 'https://qgchatting.com'
        : 'http://localhost:3000';
      window.location.href = `${mainDomain}/access-denied?subdomain=${subdomain}&reason=not_found`;
      return;
    }
  } catch {
    // En cas d'erreur, rediriger vers la page d'accès refusé
    const mainDomain = process.env.NODE_ENV === 'production' 
      ? 'https://qgchatting.com'
      : 'http://localhost:3000';
    window.location.href = `${mainDomain}/access-denied?subdomain=${subdomain}&reason=not_found`;
    return;
  }

  // Synchroniser les cookies avec le sous-domaine avant de rediriger
  const supabase = supabaseBrowser();
  const { data: { session } } = await supabase.auth.getSession();
  
  console.log('🔍 Session avant redirection:', { session: !!session, subdomain });
  
  if (session) {
    // Définir les cookies pour le sous-domaine
    const cookieNames = [
      'sb-ndlmzwwfwugtwpmebdog-auth-token',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
      'supabase-auth-token',
      'sb-auth-token',
      'cross-domain-session'
    ];
    
    console.log('🔍 Synchronisation des cookies...');
    console.log('🔍 Tous les cookies disponibles:', document.cookie);
    
    // Analyser chaque cookie individuellement
    const allCookies = document.cookie.split('; ');
    console.log('🔍 Analyse détaillée des cookies:');
    allCookies.forEach(cookie => {
      const [name, value] = cookie.split('=');
      console.log(`  - ${name}: ${value ? value.substring(0, 30) + '...' : 'vide'}`);
    });
    
    cookieNames.forEach(cookieName => {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${cookieName}=`))
        ?.split('=')[1];
      
      if (cookieValue) {
        // Cookie pour le sous-domaine
        const cookieString = `${cookieName}=${cookieValue}; domain=.qgchatting.com; path=/; secure; samesite=lax; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = cookieString;
        console.log('✅ Cookie défini:', cookieName, 'valeur:', cookieValue.substring(0, 20) + '...');
      } else {
        console.log('❌ Cookie non trouvé:', cookieName);
      }
    });
    
    // Chercher d'autres cookies Supabase
    const allCookies = document.cookie.split('; ');
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.includes('sb-') || 
      cookie.includes('supabase') || 
      cookie.includes('auth-token')
    );
    
    if (supabaseCookies.length > 0) {
      console.log('🔍 Cookies Supabase supplémentaires trouvés:', supabaseCookies);
      
      supabaseCookies.forEach(cookie => {
        const [name, value] = cookie.split('=');
        if (name && value) {
          const cookieString = `${name}=${value}; domain=.qgchatting.com; path=/; secure; samesite=lax; max-age=${60 * 60 * 24 * 7}`;
          document.cookie = cookieString;
          console.log('✅ Cookie supplémentaire défini:', name);
        }
      });
    }
    
    // Attendre un peu pour que les cookies soient définis
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Cookies synchronisés, redirection...');
  } else {
    console.log('❌ Pas de session disponible pour la synchronisation');
  }
  
  // Rediriger vers le sous-domaine
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${subdomain}.qgchatting.com`
    : `http://${subdomain}.localhost:3000`;
  
  const targetUrl = `${baseUrl}/dashboard`;
  window.location.href = targetUrl;
}

/**
 * Redirige vers le domaine principal
 */
export function redirectToMainDomain(path: string = '/home'): void {
  if (typeof window === 'undefined') return;

  const mainDomain = process.env.NODE_ENV === 'production' 
    ? 'https://qgchatting.com'
    : 'http://localhost:3000';
  
  window.location.href = `${mainDomain}${path}`;
}