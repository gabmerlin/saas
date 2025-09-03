import { z } from 'zod';
const subRe = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/; // aligné SQL CHECK

export const onboardingSchema = z.object({
  agencyName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  language: z.enum(['fr', 'en']),
  subdomain: z.string().regex(subRe).refine(s => s !== 'www', 'invalid_www')
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
