/**
 * Système de redirection centralisé pour éviter les boucles et incohérences
 */

export const REDIRECT_PATHS = {
  // Authentification
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  CALLBACK: '/auth/callback',
  
  // Pages principales
  HOME: '/home',
  DASHBOARD: '/dashboard',
  
  // Onboarding
  ONBOARDING_OWNER: '/onboarding/owner',
  ONBOARDING_BLOCKED: '/onboarding/onboarding-blocked',
  ONBOARDING_AGENCY_INITIALIZING: '/onboarding/agency-initializing',
  ONBOARDING_AGENCY_EXISTS: '/onboarding/agency-exists',
  ONBOARDING_SUCCESS: '/onboarding/success',
  
  // Subscription
  SUBSCRIPTION_RENEWAL: '/onboarding/subscription-renewal',
  SUBSCRIPTION_EXPIRED: '/onboarding/subscription-expired',
  
  // Invitations
  INVITATIONS_ACCEPT: '/invitations/accept',
} as const;

export type RedirectPath = typeof REDIRECT_PATHS[keyof typeof REDIRECT_PATHS];

/**
 * Redirection sécurisée avec validation
 */
export function safeRedirect(path: RedirectPath, router?: { push: (path: string) => void }): void {
  if (typeof window === 'undefined') return;
  
  // Vérifier que le chemin est valide
  const validPaths = Object.values(REDIRECT_PATHS);
  if (!validPaths.includes(path as RedirectPath)) {
    console.warn(`Invalid redirect path: ${path}`);
    return;
  }
  
  // Utiliser router.push si disponible (client-side navigation)
  if (router && typeof router.push === 'function') {
    router.push(path);
  } else {
    // Fallback vers window.location
    window.location.href = path;
  }
}

/**
 * Redirection forcée (pour les cas spéciaux comme OAuth)
 */
export function forceRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  window.location.href = path;
}

/**
 * Redirection avec remplacement (pour éviter l'historique)
 */
export function replaceRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  window.location.replace(path);
}

/**
 * Redirection vers un sous-domaine d'agence
 */
export function redirectToAgency(subdomain: string, path: string = '/dashboard'): void {
  if (typeof window === 'undefined' || !subdomain) return;
  
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${subdomain}.qgchatting.com`
    : `http://${subdomain}.localhost:3000`;
  
  window.location.href = `${baseUrl}${path}`;
}

/**
 * Redirection vers le domaine principal
 */
export function redirectToMainDomain(path: string = '/home'): void {
  if (typeof window === 'undefined') return;
  
  const mainDomainUrl = getMainDomainUrl();
  window.location.href = `${mainDomainUrl}${path}`;
}

/**
 * Alias pour redirectToAgency
 */
export const redirectToSubdomain = redirectToAgency;

/**
 * Détermine si on est sur le domaine principal
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
 * Obtient le sous-domaine actuel
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
 * Récupère les agences de l'utilisateur connecté
 */
export async function getUserAgencies(): Promise<Array<{id: string, name: string, subdomain: string, isOwner: boolean, createdAt: string}>> {
  try {
    const response = await fetch('/api/user/agencies');
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des agences');
    }
    
    const data = await response.json();
    return data.agencies || [];
  } catch (error) {
    console.error('Erreur getUserAgencies:', error);
    return [];
  }
}

/**
 * Obtient l'URL appropriée pour une redirection selon le contexte
 * Cette fonction ne force PAS de redirection, elle retourne juste l'URL
 */
export async function getAppropriateRedirectUrl(path: string = '/home'): Promise<string> {
  if (typeof window === 'undefined') return path;
  
  // Si on est sur le domaine principal, retourner le chemin tel quel
  if (isMainDomain()) {
    return path;
  }
  
  // Si on est sur un sous-domaine, vérifier si l'utilisateur a des agences
  try {
    const agencies = await getUserAgencies();
    
    if (agencies.length > 0) {
      // Si l'utilisateur a des agences, rediriger vers la première
      const firstAgency = agencies[0];
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${firstAgency.subdomain}.qgchatting.com`
        : `http://${firstAgency.subdomain}.localhost:3000`;
      return `${baseUrl}/dashboard`;
    } else {
      // Si pas d'agences, rediriger vers le domaine principal
      const mainDomainUrl = getMainDomainUrl();
      return `${mainDomainUrl}${path}`;
    }
  } catch (error) {
    // En cas d'erreur, rediriger vers le domaine principal
    const mainDomainUrl = getMainDomainUrl();
    return `${mainDomainUrl}${path}`;
  }
}
