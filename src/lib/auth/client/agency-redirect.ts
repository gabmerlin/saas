'use client';

import { localhostSessionSync } from './localhost-session-sync';

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
  } catch (error) {
    // En cas d'erreur, rediriger vers la page d'accès refusé
    const mainDomain = process.env.NODE_ENV === 'production' 
      ? 'https://qgchatting.com'
      : 'http://localhost:3000';
    window.location.href = `${mainDomain}/access-denied?subdomain=${subdomain}&reason=not_found`;
    return;
  }

  // En développement local, rediriger vers le dashboard du domaine principal
  if (process.env.NODE_ENV !== 'production' && window.location.hostname.includes('localhost')) {
    // En développement, rediriger vers le dashboard du domaine principal avec le sous-domaine en paramètre
    const mainDomain = 'http://localhost:3000';
    const targetUrl = `${mainDomain}/subdomain/dashboard?subdomain=${subdomain}`;
    
    // Utiliser la synchronisation via URL pour passer la session
    await localhostSessionSync.syncSessionViaRedirect(targetUrl);
  } else {
    // En production, redirection normale vers le sous-domaine
    const baseUrl = `https://${subdomain}.qgchatting.com`;
    const targetUrl = `${baseUrl}/dashboard`;
    window.location.href = targetUrl;
  }
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