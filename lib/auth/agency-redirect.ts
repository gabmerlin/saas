'use client';

import { redirectToSubdomain } from './cross-domain-auth';

/**
 * Redirige vers le dashboard d'une agence avec la session synchronisée
 */
export async function redirectToAgencyDashboard(subdomain: string): Promise<void> {
  if (!subdomain) {
    return;
  }

  await redirectToSubdomain(subdomain);
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