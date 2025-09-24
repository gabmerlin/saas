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

// Redirection d'agence
export { redirectToAgencyDashboard } from './agency-redirect';

// Route guards d'authentification
export { requireAuth as requireAuthMiddleware, requireRole as requireRoleMiddleware, requirePermission as requirePermissionMiddleware, createRouteHandler } from './route-guards';
