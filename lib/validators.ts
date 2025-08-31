import { z } from 'zod';

export const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const ownerOnboardingSchema = z.object({
  name: z.string().min(2).max(80),
  subdomain: z.string().regex(subdomainRegex, 'invalid-subdomain').min(3).max(30),
  email: z.string().email(),
  locale: z.enum(['fr', 'en']).default('fr'),
});

export type OwnerOnboardingInput = z.infer<typeof ownerOnboardingSchema>;

export const reservedSubdomains = new Set([
  'www','api','app','admin','owner','mail','ftp','vercel','static','assets'
]);
