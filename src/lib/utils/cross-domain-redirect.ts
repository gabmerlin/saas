/**
 * Utilitaires pour les redirections cross-domain
 */
'use client';

/**
 * Détermine si on est sur le domaine principal ou un sous-domaine
 */
export function isMainDomain(): boolean {
  if (typeof window === 'undefined') return true;
  
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  return !subdomain || subdomain === 'www' || subdomain === 'qgchatting' || subdomain === 'localhost';
}

/**
 * Obtient l'URL du domaine principal
 */
export function getMainDomainUrl(): string {
  if (typeof window === 'undefined') return '';
  
  const isLocalhost = window.location.hostname.includes('localhost');
  
  if (isLocalhost) {
    return 'http://localhost:3000';
  } else {
    return 'https://qgchatting.com';
  }
}

/**
 * Obtient l'URL du sous-domaine actuel
 */
export function getCurrentSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  if (!subdomain || subdomain === 'www' || subdomain === 'qgchatting' || subdomain === 'localhost') {
    return null;
  }
  
  return subdomain;
}

/**
 * Redirige vers le domaine principal avec le chemin spécifié
 */
export function redirectToMainDomain(path: string = '/home'): void {
  if (typeof window === 'undefined') return;
  
  const mainDomainUrl = getMainDomainUrl();
  window.location.href = `${mainDomainUrl}${path}`;
}

/**
 * Redirige vers le sous-domaine spécifié
 */
export function redirectToSubdomain(subdomain: string, path: string = '/dashboard'): void {
  if (typeof window === 'undefined') return;
  
  const isLocalhost = window.location.hostname.includes('localhost');
  
  if (isLocalhost) {
    window.location.href = `http://${subdomain}.localhost:3000${path}`;
  } else {
    window.location.href = `https://${subdomain}.qgchatting.com${path}`;
  }
}

/**
 * Obtient l'URL appropriée pour une redirection selon le contexte
 */
export function getAppropriateRedirectUrl(path: string = '/home'): string {
  if (typeof window === 'undefined') return path;
  
  if (isMainDomain()) {
    return path;
  } else {
    // Sur un sous-domaine, rediriger vers le domaine principal
    const mainDomainUrl = getMainDomainUrl();
    return `${mainDomainUrl}${path}`;
  }
}
