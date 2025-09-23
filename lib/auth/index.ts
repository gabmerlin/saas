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
  redirectToSubdomain,
  initializeSessionSync
} from './cross-domain-auth';

// Utilitaires de cookies (NOUVEAU SYSTÈME UNIFIÉ)
export {
  clearStoredSession,
  hasStoredSession,
  storeSession,
  getStoredSession
} from '../utils/cookies';

// Redirection d'agence
export { redirectToAgencyDashboard } from './agency-redirect';

// Middleware d'authentification
export { requireAuth as requireAuthMiddleware, requireRole as requireRoleMiddleware, requirePermission as requirePermissionMiddleware, createRouteHandler } from './middleware';
