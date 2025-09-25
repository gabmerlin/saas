'use client';

import { localhostSessionSync } from './localhost-session-sync';

/**
 * Redirige vers le dashboard d'une agence
 */
export async function redirectToAgencyDashboard(subdomain: string): Promise<void> {
  if (!subdomain || typeof window === 'undefined') {
    return;
  }

  // Construire l'URL du sous-domaine
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${subdomain}.qgchatting.com`
    : `http://${subdomain}.localhost:3000`;

  const targetUrl = `${baseUrl}/dashboard`;

  // En développement local, utiliser la synchronisation via URL
  if (process.env.NODE_ENV !== 'production' && window.location.hostname.includes('localhost')) {
    await localhostSessionSync.syncSessionViaRedirect(targetUrl);
  } else {
    // En production, redirection normale
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