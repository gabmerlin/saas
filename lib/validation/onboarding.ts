// lib/validation/onboarding.ts
import { z } from "zod";

export const SubdomainSchema = z.object({
  subdomain: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, "Invalid subdomain"),
});

export const OwnerOnboardingSchema = z.object({
  agencyName: z.string().min(2).max(80),
  agencySlug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/i),
  subdomain: z.string().min(3).max(30).regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/),
  primaryColor: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i),
  logoUrl: z.string().url().optional().or(z.literal("")).optional(),
  locale: z.enum(["fr","en"]).default("fr"),
  timezone: z.literal("UTC").default("UTC"),
});
export type OwnerOnboardingInput = z.infer<typeof OwnerOnboardingSchema>;

// --- AJOUTS pour la configuration d'agence étendue (compatible avec 0005) ---
export const ThemeTokenSchema = z.object({
  primary: z.string().min(3),
  secondary: z.string().min(3).optional(),
  accent: z.string().min(3).optional(),
  radius: z.string().min(1).default("0.75rem"),
  background: z.string().min(3).optional(),
  card: z.string().min(3).optional(),
  muted: z.string().min(3).optional(),
  border: z.string().min(3).optional(),
  ring: z.string().min(3).optional(),
});

export const ShiftSchema = z.object({
  label: z.string().min(2),
  startMinutes: z.number().int().min(0).max(1440),
  endMinutes: z.number().int().min(0).max(1440),
  sortOrder: z.number().int().min(0).default(0),
});

export const CapacitySchema = z.object({
  shiftIndex: z.number().int().min(0),
  date: z.string().nullable().optional(),
  maxChatters: z.number().int().min(0),
});

export const InvitationSchema = z.object({
  email: z.string().email().optional(),
  roleKey: z.enum(["admin", "manager", "marketing", "employee"]),
});

/** Schéma étendu pour la finalisation agence (utilisé plus tard) */
export const OwnerOnboardingAgencySchema = z.object({
  agencyName: z.string().min(2),
  subdomain: z.string().regex(/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/),
  tenantId: z.string().uuid().optional(), // ID du tenant créé par l'API owner
  localeDefault: z.enum(["fr", "en"]).default("fr"),
  currencyDisplay: z.enum(["USD"]).default("USD"),
  themePreset: z.string().default("ocean"),
  themeTokens: ThemeTokenSchema,
  planKey: z.enum(["starter","advanced","professional","on_demand"]),
  instagramAddon: z.boolean().default(false),
  billingEmails: z.array(z.string().email()).min(1).max(3),
  enforceVerifiedEmail: z.boolean().default(true),
  suggest2FA: z.boolean().default(true),
  shifts: z.array(ShiftSchema).min(1).max(12),
  capacities: z.array(CapacitySchema).optional(),
  autoApproveRules: z.boolean().default(false),
  deadlineSundayUTC: z.string().default("16:00"),
  payroll: z.object({
    hourlyEnabled: z.boolean().default(false),
    hourlyUSD: z.number().nullable().optional(),
    revenueSharePercent: z.number().min(0).max(100).default(0),
  }),
  strike: z.object({
    graceMinutes: z.number().int().min(0).default(0),
    lateFeeUSD: z.number().min(0).default(5),
    absenceFeeUSD: z.number().min(0).default(10),
    poolTopCount: z.number().int().min(1).max(10).default(5)
  }),
  telegram: z.object({
    channelId: z.string().optional(),
    dailyDigest: z.boolean().default(true),
  }),
  instagramEnabled: z.boolean().default(false),
  competition: z.object({
    optIn: z.boolean().default(false),
    alias: z.string().optional()
  }),
  invites: z.array(InvitationSchema).max(50).optional(),
});
export type OwnerOnboardingAgencyInput = z.infer<typeof OwnerOnboardingAgencySchema>;
