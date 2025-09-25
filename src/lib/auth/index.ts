// lib/auth/index.ts
// Point d'entrée centralisé pour toutes les fonctions d'authentification

// Configuration
export { AUTH_CONFIG, GOOGLE_OAUTH_CONFIG } from './config';

// Types
export type { User, Session, AuthState, AuthActions, AuthConfig } from './types';

// Session et authentification côté serveur
export { getServerSession, requireAuth, requireRole, requirePermission } from './server/session';

// Composants
export { AuthGuard } from '@/components/auth/auth-guard';
export { OwnerGuard } from '@/components/auth/owner-guard';
export { OnboardingGuard } from '@/components/auth/onboarding-guard';
export { AgencyMemberGuard } from '@/components/auth/agency-member-guard';
export { AgencyOwnerGuard } from '@/components/auth/agency-owner-guard';
export { SessionProvider } from '@/components/auth/session-provider';
export { CrossDomainSessionProvider } from '@/components/auth/cross-domain-session-provider';

// Cross-domain sync
export { crossDomainSync } from './cross-domain-sync';

// Hooks
export { useAuth } from '@/lib/hooks/use-auth';

// Actions côté client
export { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, resetPassword } from './client/auth-actions';

// Redirection d'agence
export { redirectToAgencyDashboard } from './client/agency-redirect';

// Route guards d'authentification
export { requireAuth as requireAuthMiddleware, requireRole as requireRoleMiddleware, requirePermission as requirePermissionMiddleware, createRouteHandler } from './server/route-guards';
