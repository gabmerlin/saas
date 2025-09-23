'use client';

/**
 * Utilitaires unifiés pour la gestion des cookies cross-domain
 * Consolidation des fonctions dupliquées de cross-domain-auth.ts et client.ts
 */

/**
 * Obtient le domaine racine pour les cookies partagés
 */
export function getRootDomain(): string {
  if (typeof window === 'undefined') return '.qgchatting.com';
  
  const hostname = window.location.hostname;
  
  // En développement
  if (hostname === 'localhost' || hostname.includes('localhost')) {
    return 'localhost';
  }
  
  // En production, extraire le domaine racine
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  
  return '.qgchatting.com';
}

/**
 * Configure un cookie avec le bon domaine pour le partage cross-domain
 */
export function setCookieWithDomain(name: string, value: string, days: number = 30): void {
  if (typeof window === 'undefined') return;
  
  const domain = getRootDomain();
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};domain=${domain};path=/;SameSite=Lax;Secure=${window.location.protocol === 'https:'}`;
}

/**
 * Récupère un cookie avec le bon domaine
 */
export function getCookieWithDomain(name: string): string | null {
  if (typeof window === 'undefined') return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  
  return null;
}

/**
 * Supprime un cookie avec le bon domaine
 */
export function removeCookieWithDomain(name: string): void {
  if (typeof window === 'undefined') return;
  
  const domain = getRootDomain();
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain};path=/`;
}

/**
 * Stocke une session dans les cookies partagés et localStorage
 */
export function storeSession(sessionData: any): void {
  if (typeof window === 'undefined') return;
  
  const sessionString = JSON.stringify(sessionData);
  
  // Stocker dans les cookies avec le bon domaine pour le partage cross-domain
  setCookieWithDomain('qg-session', sessionString, 30);
  
  // Aussi stocker dans localStorage comme fallback
  localStorage.setItem('supabase-session', sessionString);
  sessionStorage.setItem('supabase-session', sessionString);
}

/**
 * Récupère une session depuis les cookies partagés ou localStorage
 */
export function getStoredSession(): any | null {
  if (typeof window === 'undefined') return null;
  
  // D'abord essayer localStorage (où la session est stockée)
  const localStorageValue = localStorage.getItem('supabase-session');
  if (localStorageValue) {
    try {
      return JSON.parse(localStorageValue);
    } catch {
      // Ignore parsing errors
    }
  }
  
  // Ensuite essayer les cookies avec domaine
  const cookieValue = getCookieWithDomain('qg-session');
  if (cookieValue) {
    try {
      return JSON.parse(cookieValue);
    } catch {
      // Ignore parsing errors
    }
  }
  
  return null;
}

/**
 * Nettoie une session stockée
 */
export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  
  // Supprimer des cookies avec domaine
  removeCookieWithDomain('qg-session');
  
  // Aussi supprimer de localStorage
  localStorage.removeItem('supabase-session');
  sessionStorage.removeItem('supabase-session');
}

/**
 * Vérifie si une session est stockée
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  const storedSession = getStoredSession();
  return !!storedSession;
}
