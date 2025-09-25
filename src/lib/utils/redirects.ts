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
