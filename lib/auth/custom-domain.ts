// Configuration pour masquer le domaine Supabase avec un nom personnalisé
export const CUSTOM_AUTH_CONFIG = {
  // Nom de l'application qui apparaîtra dans l'authentification Google
  APP_NAME: 'QG Chatting',
  APP_DOMAIN: 'qgchatting.com',
  
  // Configuration pour personnaliser l'affichage OAuth
  OAUTH_BRANDING: {
    // Nom qui apparaîtra dans l'écran de consentement Google
    displayName: 'QG Chatting',
    // Description qui apparaîtra dans l'écran de consentement
    description: 'Plateforme de gestion d\'agences OnlyFan & MyM',
    // Logo de l'application (optionnel)
    logoUrl: '/logo.png',
  },
  
  // Paramètres OAuth personnalisés
  OAUTH_PARAMS: {
    // Inclure les scopes accordés
    include_granted_scopes: 'true',
    // Type d'accès
    access_type: 'offline',
    // Forcer le consentement pour un affichage cohérent
    prompt: 'consent',
  }
} as const;

/**
 * Génère une URL d'authentification Google personnalisée
 */
export function generateCustomGoogleAuthUrl(redirectTo: string, baseUrl: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirect_uri: `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    response_type: 'code',
    scope: 'email profile',
    access_type: CUSTOM_AUTH_CONFIG.OAUTH_PARAMS.access_type,
    prompt: CUSTOM_AUTH_CONFIG.OAUTH_PARAMS.prompt,
    include_granted_scopes: CUSTOM_AUTH_CONFIG.OAUTH_PARAMS.include_granted_scopes,
  });

  return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
}
