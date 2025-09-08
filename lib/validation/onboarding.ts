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
