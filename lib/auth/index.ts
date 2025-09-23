// lib/auth/index.ts
// Point d'entrée centralisé pour toutes les fonctions d'authentification

// Configuration
export { AUTH_CONFIG, GOOGLE_OAUTH_CONFIG } from './config';

// Session et authentification
export { getServerSession, requireAuth, requireRole, requirePermission } from './session';

// Actions d'authentification
export { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithGoogle, 
  signOut, 
  resetPassword 
} from './actions';

// Synchronisation cross-domain (NOUVEAU SYSTÈME UNIFIÉ)
export {
  syncSessionAcrossDomains,
  clearStoredSession,
  hasStoredSession,
  redirectToSubdomain,
  initializeSessionSync
} from './cross-domain-auth';

// Redirection d'agence
export { redirectToAgencyDashboard } from './agency-redirect';

// Middleware d'authentification
export { requireAuth as requireAuthMiddleware, requireRole as requireRoleMiddleware, requirePermission as requirePermissionMiddleware, createRouteHandler } from './middleware';
