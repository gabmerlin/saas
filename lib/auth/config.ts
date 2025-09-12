// lib/auth/config.ts
export const AUTH_CONFIG = {
  // Sessions
  SESSION_DURATION: 6 * 60 * 60, // 6 heures en secondes
  REMEMBER_ME_DURATION: 30 * 24 * 60 * 60, // 30 jours en secondes
  
  // Email verification
  EMAIL_VERIFICATION_REQUIRED: true,
  EMAIL_VERIFICATION_REDIRECT_URL: '/auth/verify-email',
  
  // 2FA
  TOTP_ISSUER: 'QG Chatting',
  TOTP_WINDOW: 1, // Tolérance de 1 période (30s)
  
  // Password
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_SPECIAL_CHARS: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_UPPERCASE: true,
  
  // Invitations
  INVITATION_EXPIRY_HOURS: 24,
  REFERRAL_CODE_LENGTH: 8,
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60, // 15 minutes
} as const;

export const GOOGLE_OAUTH_CONFIG = {
  SCOPES: ['email', 'profile'],
  REDIRECT_URL: '/callback',
} as const;