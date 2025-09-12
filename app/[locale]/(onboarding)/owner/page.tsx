
"use client";

/**
 * Onboarding Owner — Page unique (corrigée)
 * Correctifs:
 *  - Tooltips stables (toujours visibles, positionnés "right/start", via Portal)
 *  - Placeholders + textes préremplis mieux distingués (italic + opacity)
 *  - Grilles alignées en mode "Personnalisé" (12 colonnes, items-start, gaps constants)
 *  - Pricing complet + simulation On‑Demand + add-on Instagram (+15$/mois)
 *  - Explications enrichies (S8 / S10 / S12)
 *  - Valeurs negatives interdites (min=0 + clamp côté JS)
 *  - Vérif sous‑domaine: feedback clair ("Disponible/Pris/Erreur") + FQDN affiché
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { motion } from "framer-motion";
import {
  HelpCircle,
  XCircle,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Info,
  Trash2,
  Building2,
  Globe,
  Palette,
  Settings,
  DollarSign,
  Lightbulb,
  Users,
  Rocket,
  Trophy,
  Smartphone,
  Lock,
  Clock,
  RefreshCw,
  Sparkles,
  Calendar,
  CreditCard,
  ClipboardList,
  Mail,
} from "lucide-react";

import {
  OwnerOnboardingSchema,
  OwnerOnboardingAgencySchema,
} from "@/lib/validation/onboarding";


import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";



/* ----------------- Types ----------------- */

type BasicForm = z.infer<typeof OwnerOnboardingSchema>;
type AdvForm = z.infer<typeof OwnerOnboardingAgencySchema>;

/* ----------------- Composants Premium ----------------- */

// Carte moderne avec animations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ModernCard = React.forwardRef<HTMLDivElement, any>(({ children, className = "", finalColors, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    whileHover={{ 
      y: -2, 
      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      transition: { duration: 0.2 }
    }}
    className={`bg-transparent p-8 shadow-lg border border-gray-100/50 backdrop-blur-sm neon-card transition-all duration-300 ${className}`}
    style={{
      background: `linear-gradient(135deg, ${finalColors?.card || '#ffffff'} 0%, ${finalColors?.card || '#ffffff'}95 100%)`,
      borderColor: `${finalColors?.border || '#e5e7eb'}4D`,
      borderRadius: finalColors?.radius || '0.75rem'
    }}
    {...props}
  >
    {children}
  </motion.div>
));
ModernCard.displayName = "ModernCard";

// Input moderne
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ModernInput = ({ className = "", finalColors, ...props }: any) => (
  <motion.input
    whileFocus={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
    className={`w-full px-6 py-4 border-2 text-base font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${className}`}
    style={{
      backgroundColor: finalColors?.card || '#ffffff',
      borderColor: `${finalColors?.border || '#e5e7eb'}4D`,
      color: finalColors?.foreground || '#000000',
      boxShadow: `0 4px 16px ${finalColors?.primary || '#3b82f6'}0D`,
      borderRadius: finalColors?.radius || '0.75rem'
    }}
    {...props}
  />
);

// Bouton moderne avec animations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ModernButton = ({ children, className = "", variant = "primary", finalColors, ...props }: any) => {
  const baseClasses = "px-8 py-4 font-semibold text-base transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-20";
  
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    destructive: "bg-red-500 text-white hover:bg-red-600"
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseClasses} ${variants[variant] || variants.primary} ${className}`}
      style={{
        boxShadow: variant === "primary" ? "0 8px 32px rgba(59, 130, 246, 0.3)" : "0 4px 16px rgba(0,0,0,0.1)",
        borderRadius: finalColors?.radius || '0.75rem'
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// Progress Stepper moderne
const ProgressStepper = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="w-full bg-transparent/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
    <div className="max-w-7xl mx-auto px-6 py-4">
      {/* Ligne de progression simple */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-purple-600 rounded-full shadow-sm"
          initial={{ width: "0%" }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>
      
      {/* Labels des étapes */}
      <div className="flex justify-between mt-3">
        {["Informations", "Configuration", "Fonctionnalités", "Finalisation"].map((label, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`text-sm font-medium transition-colors duration-300 ${
              i < currentStep ? 'text-gray-900' : i === currentStep ? 'text-blue-600 font-semibold' : 'text-gray-400'
            }`}
          >
            {label}
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

type DomainSourceStatus =
  | "idle"
  | "checking"
  | "ok"
  | "taken"
  | "invalid"
  | "error";

/* ----------------- Constantes ----------------- */

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
  process.env.ROOT_DOMAIN ||
  "qgchatting.com";

const SUBDOMAIN_PATTERN = "^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$";

const LocalSubdomainSchema = z
  .string()
  .min(3, "Minimum 3 caractères")
  .max(30, "Maximum 30 caractères")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Seules lettres/chiffres et tirets, sans commencer/finir par un tiret"
  );

/** Tokens étendus (background/card/muted/border/ring). */
type ThemeTokens = {
  primary: string;
  secondary?: string;
  accent?: string;
  radius: string;
  background?: string;
  card?: string;
  muted?: string;
  border?: string;
  ring?: string;
};

/** État avancé local compatible Zod au submit. */
type AdvFormExt = Omit<AdvForm, "themeTokens"> & {
  themeTokens: ThemeTokens;
  invitations?: Array<{
    email: string;
    role: "admin" | "manager" | "employee";
  }>;
};

/* ----------------- Helpers génériques ----------------- */

function clamp01(n: number) { return isNaN(n) ? 0 : Math.max(0, n); }

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function minutesToHHmm(m: number) {
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60);
  const min = mm % 60;
  return `${pad(h)}:${pad(min)}`;
}
function hhmmToMinutes(v: string) {
  const [h, m] = v.split(":").map((x) => parseInt(x || "0", 10));
  if (isNaN(h) || isNaN(m)) return 0;
  return ((h * 60 + m) % 1440 + 1440) % 1440;
}
function slugify(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ----------------- Helpers couleur (OKLCH) ----------------- */

function srgbToLinear(c: number) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function hexToRgb(hex: string) {
  const s = hex.replace("#", "");
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function linearSrgbToOklab(R: number, G: number, B: number) {
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { L, a, b };
}
function oklabToOklch({ L, a, b }: { L: number; a: number; b: number }) {
  const C = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return { L, C, h };
}
function luminanceSRGB({ r, g, b }: { r: number; g: number; b: number }) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function hexToOklchString(hex: string) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const lab = linearSrgbToOklab(
      srgbToLinear(r),
      srgbToLinear(g),
      srgbToLinear(b)
    );
    const { L, C, h } = oklabToOklch(lab);
    const Lc = Math.min(Math.max(L, 0), 1);
    const Cc = Math.max(C, 0);
    return `oklch(${Lc.toFixed(3)} ${Cc.toFixed(3)} ${h.toFixed(3)})`;
  } catch {
    return "oklch(0.21 0.006 285.885)";
  }
}
function fgForHex(bg: string) {
  const L = luminanceSRGB(hexToRgb(bg));
  return L > 0.55 ? "oklch(0 0 0)" : "oklch(0.985 0 0)";
}

/* ----------------- Presets ----------------- */

type RoundnessKey = "sharp" | "soft" | "pill";
const ROUNDNESS: Record<RoundnessKey, string> = {
  sharp: "0.25rem",
  soft: "0.75rem",
  pill: "1.5rem",
};

type PresetKey =
  | "ocean"
  | "sunset"
  | "pastelDream"
  | "forestDusk"
  | "sakuraBlush"
  | "magma"
  | "noirGold"
  | "arcticMint"
  | "custom";

type Preset = {
  key: PresetKey;
  name: string;
  tokens: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    muted: string;
    border: string;
    ring: string;
  };
  gradient?: string;
  defaultRoundness: RoundnessKey;
  neonRecommended?: boolean;
};

const PRESETS: Preset[] = [
  {
    key: "ocean",
    name: "Ocean Breeze",
    tokens: {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#22c55e",
      background: "#e6f2ff", // plus clair pour contraste texte
      card: "#ffffff",
      muted: "#dbeafe",
      border: "#93c5fd",
      ring: "#3b82f6",
    },
    gradient: "linear-gradient(135deg, #e6f2ff 0%, #c7d2fe 40%, #99f6e4 100%)",
    defaultRoundness: "soft",
  },
  {
    key: "sunset",
    name: "Sunset Pop",
    tokens: {
      primary: "#f97316",
      secondary: "#f59e0b",
      accent: "#ef4444",
      background: "#ffedd5",
      card: "#ffffff",
      muted: "#ffe8d6",
      border: "#fecaa1",
      ring: "#fb923c",
    },
    gradient: "linear-gradient(135deg, #ffedd5 0%, #fb7185 45%, #f59e0b 100%)",
    defaultRoundness: "soft",
  },
  {
    key: "pastelDream",
    name: "Pastel Dream",
    tokens: {
      primary: "#a78bfa",
      secondary: "#60a5fa",
      accent: "#f472b6",
      background: "#f5f3ff",
      card: "#ffffff",
      muted: "#fdf2f8",
      border: "#e9d5ff",
      ring: "#a78bfa",
    },
    gradient: "linear-gradient(135deg, #f5f3ff 0%, #e0f2fe 50%, #fce7f3 100%)",
    defaultRoundness: "pill",
  },
  {
    key: "forestDusk",
    name: "Forest Dusk",
    tokens: {
      primary: "#16a34a",
      secondary: "#0ea5e9",
      accent: "#f59e0b",
      background: "#052e1d",
      card: "#0f1f1a",
      muted: "#0b2a22",
      border: "#14532d",
      ring: "#16a34a",
    },
    gradient: "linear-gradient(160deg, #052e1d 0%, #0b2a22 40%, #1e293b 100%)",
    defaultRoundness: "sharp",
  },
  {
    key: "sakuraBlush",
    name: "Sakura Blush",
    tokens: {
      primary: "#ec4899",
      secondary: "#f472b6",
      accent: "#a855f7",
      background: "#fff1f5",
      card: "#ffffff",
      muted: "#fde2e8",
      border: "#fecdd3",
      ring: "#f472b6",
    },
    gradient: "linear-gradient(135deg, #fff1f5 0%, #ffe4e6 50%, #f5d0fe 100%)",
    defaultRoundness: "pill",
  },
  {
    key: "magma",
    name: "Magma",
    tokens: {
      primary: "#ef4444",
      secondary: "#f97316",
      accent: "#fde047",
      background: "#1c1917",
      card: "#0f0f0f",
      muted: "#171717",
      border: "#3f3f46",
      ring: "#ef4444",
    },
    gradient: "linear-gradient(135deg, #111111 0%, #1f2937 60%, #450a0a 100%)",
    defaultRoundness: "sharp",
  },
  {
    key: "noirGold",
    name: "Noir & Gold",
    tokens: {
      primary: "#f59e0b",
      secondary: "#fcd34d",
      accent: "#10b981",
      background: "#0b0b0b",
      card: "#141414",
      muted: "#191919",
      border: "#2b2b2b",
      ring: "#f59e0b",
    },
    gradient: "linear-gradient(180deg, #0b0b0b 0%, #111111 60%, #0b0b0b 100%)",
    defaultRoundness: "soft",
  },
  {
    key: "arcticMint",
    name: "Arctic Mint",
    tokens: {
      primary: "#10b981",
      secondary: "#06b6d4",
      accent: "#60a5fa",
      background: "#ecfeff",
      card: "#ffffff",
      muted: "#e6fffb",
      border: "#bae6fd",
      ring: "#06b6d4",
    },
    gradient: "linear-gradient(135deg, #ecfeff 0%, #e6fffb 50%, #e0f2fe 100%)",
    defaultRoundness: "pill",
  },
  {
    key: "custom",
    name: "Personnalisé",
    tokens: {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#22c55e",
      background: "#ffffff",
      card: "#ffffff",
      muted: "#f1f5f9",
      border: "#e5e7eb",
      ring: "#94a3b8",
    },
    gradient: "linear-gradient(135deg, #ffffff, #f1f5f9)",
    defaultRoundness: "soft",
  },
];

/* ----------------- Defaults ----------------- */

const basicDefaults: BasicForm = {
  agencyName: "",
  agencySlug: "",
  subdomain: "",
  primaryColor: "#3b82f6",
  logoUrl: "",
  locale: "fr",
  timezone: "UTC",
};

const initialPreset = PRESETS[2]; // Midnight Neon par défaut pour un contraste clair

const advDefaults: AdvFormExt = {
  agencyName: "",
  subdomain: "",
  localeDefault: "fr",
  currencyDisplay: "USD",
  themePreset: initialPreset.key,
  themeTokens: {
    primary: initialPreset.tokens.primary,
    secondary: initialPreset.tokens.secondary,
    accent: initialPreset.tokens.accent,
    radius: ROUNDNESS[initialPreset.defaultRoundness],
    background: initialPreset.tokens.background,
    card: initialPreset.tokens.card,
    muted: initialPreset.tokens.muted,
    border: initialPreset.tokens.border,
    ring: initialPreset.tokens.ring,
  },
  planKey: "starter",
  instagramAddon: false,
  billingEmails: [],
  enforceVerifiedEmail: true,
  suggest2FA: true,
  shifts: [
    { label: "Matin", startMinutes: 8 * 60, endMinutes: 14 * 60, sortOrder: 0 },
    { label: "Après-midi", startMinutes: 14 * 60, endMinutes: 20 * 60, sortOrder: 1 },
    { label: "Soir", startMinutes: 20 * 60, endMinutes: 2 * 60, sortOrder: 2 },
    { label: "Nuit", startMinutes: 2 * 60, endMinutes: 8 * 60, sortOrder: 3 },
  ],
  capacities: [
    { shiftIndex: 0, date: null, maxChatters: 0 },
    { shiftIndex: 1, date: null, maxChatters: 0 },
    { shiftIndex: 2, date: null, maxChatters: 0 },
    { shiftIndex: 3, date: null, maxChatters: 0 },
  ],
  autoApproveRules: false,
  deadlineSundayUTC: "16:00",
  payroll: { hourlyEnabled: false, hourlyUSD: null, revenueSharePercent: 0 },
  strike: { graceMinutes: 0, lateFeeUSD: 5, absenceFeeUSD: 10, poolTopCount: 5 },
  telegram: { channelId: "", dailyDigest: true },
  instagramEnabled: false,
  competition: { optIn: false, alias: "" },
  invitations: [],
};

/* ----------------- UI helpers ----------------- */


export default function OwnerOnboardingPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();

  const [basic, setBasic] = useState<BasicForm>(basicDefaults);
  const [adv, setAdv] = useState<AdvFormExt>(advDefaults);

  const [presetKey, setPresetKey] = useState<PresetKey>("ocean");
  const [roundness, setRoundness] = useState<RoundnessKey>("soft");
  const [neon, setNeon] = useState<boolean>(true);
  const [bgGradient, setBgGradient] = useState<string>(
    PRESETS.find((p) => p.key === presetKey)?.gradient || "linear-gradient(135deg, #ffffff, #f1f5f9)"
  );

  const lastPresetSnapshot = useRef<Preset | null>(
    PRESETS.find((p) => p.key === presetKey && p.key !== "custom") ?? PRESETS[0]
  );

  const [vercelStatus, setVercelStatus] = useState<DomainSourceStatus>("idle");
  const [localSubError, setLocalSubError] = useState<string | null>(null);

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Système d'étapes réorganisé selon la demande
  const steps = [
    {
      id: 1,
      title: "Informations de base",
      description: "Agence, sous-domaine, branding et préférences",
      sections: ["s1", "s2", "s3", "s4"]
    },
    {
      id: 2,
      title: "Configuration des équipes",
      description: "Shifts, paie, strikes et validation",
      sections: ["s7", "s9", "s10", "s8"]
    },
    {
      id: 3,
      title: "Fonctionnalités avancées",
      description: "Compétition, telegram et sécurité",
      sections: ["s12", "s11", "s6"]
    },
    {
      id: 4,
      title: "Finalisation",
      description: "Plan, invitations et publication",
      sections: ["s5", "s13", "s14"]
    }
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = steps.length;

  const anchors = useRef<Record<string, HTMLDivElement | null>>({});
  const setAnchor = (id: string) => (el: HTMLDivElement | null) => { anchors.current[id] = el; };

  // Scroll vers le haut quand on change d'étape
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const fqdn = useMemo(() => (basic.subdomain ? `${basic.subdomain}.${ROOT_DOMAIN}` : ""), [basic.subdomain]);

  /* --------- Submit ---------- */
  async function onPublish() {
    setErrors([]);
    setSubmitting(true);

    const sectionErrors: string[] = [];

    const parsedSub = LocalSubdomainSchema.safeParse(basic.subdomain.trim());
    if (!parsedSub.success) {
      sectionErrors.push("S2 – Sous-domaine : invalide (3–30, a-z 0-9, tirets sans début/fin).");
    } else if (vercelStatus === "taken") {
      sectionErrors.push("S2 – Sous-domaine : déjà pris sur Vercel.");
    } else if (vercelStatus === "error") {
      sectionErrors.push("S2 – Sous-domaine : erreur de vérification Vercel.");
    }

    const b = OwnerOnboardingSchema.safeParse(basic);
    if (!b.success) sectionErrors.push("S1/S3/S4 – Formulaire basique : champs manquants ou invalides.");

    const a = OwnerOnboardingAgencySchema.safeParse(adv);
    if (!a.success) sectionErrors.push("S3/S5…S13 – Configuration avancée : champs invalides (tokens, emails, shifts…).");

    setErrors(sectionErrors);
    if (sectionErrors.length > 0) { setSubmitting(false); return; }

    type OwnerResp = { agencyUrl?: string };
    const r1 = await fetch("/api/onboarding/owner", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b.data),
    });

    let agencyUrl: string | null = null;
    if (!r1.ok) {
      setErrors((arr) => [...arr, `S1 – Création agence : ${r1.status} ${r1.statusText}`]);
      setSubmitting(false);
      return;
    } else {
      const j: OwnerResp = await r1.json().catch(() => ({ agencyUrl: undefined }));
      agencyUrl = j?.agencyUrl ?? null;
    }

    type AgencyResp = { ok: boolean; error?: string };
    const r2 = await fetch("/api/onboarding/agency", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...a.data, deadlineDay }),
    });
    const j2: AgencyResp = await r2.json().catch(() => ({ ok: false, error: "NETWORK" }));
    if (!j2.ok) {
      setErrors((arr) => [...arr, `S3…S13 – Configuration avancée : ${j2.error || "échec d'enregistrement"}`]);
      setSubmitting(false);
      return;
    }

    const target = agencyUrl?.replace(/\/$/, "") + "/dashboard" || `https://${basic.subdomain}.${ROOT_DOMAIN}/dashboard`;
    window.location.href = target;
  }

  /* --------- Auth + billing email par défaut ---------- */
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        const urlNext = encodeURIComponent(window.location.pathname);
        router.replace(`/sign-in?next=${urlNext}`);
        return;
      }
      if (user.email) {
        setAdv((a) => {
          const exists = (a.billingEmails || []).some((em) => em.toLowerCase() === user.email!.toLowerCase());
          return exists ? a : { ...a, billingEmails: [...(a.billingEmails || []), user.email!] };
        });
      }
      // Une agence max -> si déjà liée, redirige dashboard
      type UserTenantRow = { tenants?: { subdomain?: string } };
      const { data } = await supabase.from("user_tenants").select("tenant_id, tenants!inner(subdomain)").limit(1);
      const sub = (data?.[0] as UserTenantRow | undefined)?.tenants?.subdomain;
      if (sub) window.location.href = `https://${sub}.${ROOT_DOMAIN}/dashboard`;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------- Sync de base ---------- */
  useEffect(() => {
    const nextSlug = slugify(basic.agencyName);
    setBasic((b) => (b.agencySlug === nextSlug ? b : { ...b, agencySlug: nextSlug }));
  }, [basic.agencyName]);

  useEffect(() => {
    setAdv((a) => ({ ...a, agencyName: basic.agencyName, subdomain: basic.subdomain }));
  }, [basic.agencyName, basic.subdomain]);

  useEffect(() => {
    setAdv((a) => ({ ...a, localeDefault: basic.locale as "fr" | "en" }));
  }, [basic.locale]);

  // Forcer l'état d'Instagram sur l'add‑on (billing) uniquement
  useEffect(() => {
    setAdv((a) => ({ ...a, instagramEnabled: a.instagramAddon }));
  }, [adv.instagramAddon]);

  /* --------- Preset handling ---------- */
  useEffect(() => {
    const p = PRESETS.find((x) => x.key === presetKey) || PRESETS[0];

    if (p.key !== "custom") {
      lastPresetSnapshot.current = p;
      setRoundness(p.defaultRoundness);
      setNeon(!!p.neonRecommended);
      setBgGradient(p.gradient || "linear-gradient(135deg, #ffffff, #f1f5f9)");

      setAdv((a) => ({
        ...a,
        themePreset: p.key,
        themeTokens: {
          ...a.themeTokens,
          primary: p.tokens.primary,
          secondary: p.tokens.secondary,
          accent: p.tokens.accent,
          radius: ROUNDNESS[p.defaultRoundness],
          background: p.tokens.background,
          card: p.tokens.card,
          muted: p.tokens.muted,
          border: p.tokens.border,
          ring: p.tokens.ring,
        },
      }));
    } else {
      const snap = lastPresetSnapshot.current ?? PRESETS[0];
      setRoundness(snap.defaultRoundness);
      setNeon(!!snap.neonRecommended);
      setBgGradient(snap.gradient || "linear-gradient(135deg, #ffffff, #f1f5f9)");
      setAdv((a) => ({
        ...a,
        themePreset: "custom",
        themeTokens: {
          ...a.themeTokens,
          primary: a.themeTokens.primary ?? snap.tokens.primary,
          secondary: a.themeTokens.secondary ?? snap.tokens.secondary,
          accent: a.themeTokens.accent ?? snap.tokens.accent,
          radius: a.themeTokens.radius ?? ROUNDNESS[snap.defaultRoundness],
          background: a.themeTokens.background ?? snap.tokens.background,
          card: a.themeTokens.card ?? snap.tokens.card,
          muted: a.themeTokens.muted ?? snap.tokens.muted,
          border: a.themeTokens.border ?? snap.tokens.border,
          ring: a.themeTokens.ring ?? snap.tokens.ring,
        },
      }));
    }
  }, [presetKey]);

  /* --------- Arrondi ---------- */
  useEffect(() => {
    setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, radius: ROUNDNESS[roundness] } }));
  }, [roundness]);

  /* --------- Vérification sous-domaine ---------- */
  useEffect(() => {
    const sd = basic.subdomain.trim().toLowerCase();

    if (!sd) {
      setLocalSubError(null);
      setVercelStatus("idle");
      return;
    }

    const parsed = LocalSubdomainSchema.safeParse(sd);
    if (!parsed.success) {
      const m = parsed.error.issues?.[0]?.message || "Sous-domaine invalide";
      setLocalSubError(m);
      setVercelStatus("idle");
      return;
    }
    setLocalSubError(null);

    let cancelled = false;
    setVercelStatus("checking");

    type CheckResp = { ok?: boolean; available?: boolean };
    const t = setTimeout(async () => {
      try {
        const url = `/api/tenants/domains/check?subdomain=${encodeURIComponent(sd)}&t=${Date.now()}`;
        const r = await fetch(url, { cache: "no-store" });
        const j: CheckResp = await r.json().catch(() => ({ ok: false, available: undefined }));
        if (!cancelled) {
          if (j?.ok && j?.available === true) setVercelStatus("ok");
          else if (j?.ok && j?.available === false) setVercelStatus("taken");
          else setVercelStatus("error");
        }
      } catch { if (!cancelled) setVercelStatus("error"); }
    }, 450);

    return () => { cancelled = true; clearTimeout(t); };
  }, [basic.subdomain]);

  /* --------- Shifts & Billing ---------- */

  function addShift(): void {
    setAdv((a) => {
      const i = a.shifts.length;
      const s = { label: `Shift ${i + 1}`, startMinutes: 9 * 60, endMinutes: 17 * 60, sortOrder: i };
      const nextCaps = [...(a.capacities ?? []), { shiftIndex: i, date: null, maxChatters: 0 }];
      return { ...a, shifts: [...a.shifts, s], capacities: nextCaps };
    });
  }
  function removeShift(idx: number): void {
    setAdv((a) => {
      const arr = a.shifts.filter((_, i) => i !== idx).map((s, i) => ({ ...s, sortOrder: i }));
      // remove capacities for this shift and shift down indices after it
      const filtered = (a.capacities ?? []).filter((c) => c.shiftIndex !== idx);
      const reindexed = filtered.map((c) => (c.shiftIndex > idx ? { ...c, shiftIndex: c.shiftIndex - 1 } : c));
      return { ...a, shifts: arr, capacities: reindexed };
    });
  }
  function updateShiftLabel(idx: number, v: string): void {
    setAdv((a) => { const arr = [...a.shifts]; arr[idx] = { ...arr[idx], label: v }; return { ...a, shifts: arr }; });
  }
  function updateShiftStart(idx: number, hhmm: string): void {
    const m = hhmmToMinutes(hhmm);
    setAdv((a) => { const arr = [...a.shifts]; arr[idx] = { ...arr[idx], startMinutes: m }; return { ...a, shifts: arr }; });
  }
  function updateShiftEnd(idx: number, hhmm: string): void {
    const m = hhmmToMinutes(hhmm);
    setAdv((a) => { const arr = [...a.shifts]; arr[idx] = { ...arr[idx], endMinutes: m }; return { ...a, shifts: arr }; });
  }

  // Capacité max par shift (employés)
  function getShiftCapacity(idx: number): number {
    const cap = (adv.capacities ?? []).find((c) => c.shiftIndex === idx && (c.date == null || c.date === undefined));
    return cap?.maxChatters ?? 0;
  }
  function setShiftCapacity(idx: number, val: number): void {
    const v = Math.max(0, isNaN(val) ? 0 : val);
    setAdv((a) => {
      const caps = [...(a.capacities ?? [])];
      const j = caps.findIndex((c) => c.shiftIndex === idx && (c.date == null || c.date === undefined));
      if (j >= 0) caps[j] = { ...caps[j], maxChatters: v };
      else caps.push({ shiftIndex: idx, date: null, maxChatters: v });
      return { ...a, capacities: caps };
    });
  }


  /* --------- LIVE THEME injection ---------- */
  const themeVars: React.CSSProperties = useMemo(() => {
  const tkn = adv.themeTokens;
    const tokenPrimaryHex = tkn.primary || "#3b82f6";
  const tokenSecondaryHex = tkn.secondary || "#64748b";
  const tokenAccentHex = tkn.accent || "#22c55e";
  const tokenBackgroundHex = tkn.background || "#ffffff";
  const tokenCardHex = tkn.card || "#ffffff";
  const tokenMutedHex = tkn.muted || "#f1f5f9";
  const tokenBorderHex = tkn.border || "#e5e7eb";
  const tokenRingHex = tkn.ring || "#94a3b8";

    const toOK = (hex: string) => hexToOklchString(hex);
    const toFG = (hex: string) => fgForHex(hex);

    const cssVars: Record<string, string> = {
      "--primary": toOK(tokenPrimaryHex),
      "--primary-foreground": toFG(tokenPrimaryHex),
      "--secondary": toOK(tokenSecondaryHex),
      "--secondary-foreground": toFG(tokenSecondaryHex),
      "--accent": toOK(tokenAccentHex),
      "--accent-foreground": toFG(tokenAccentHex),
      "--radius": tkn.radius ?? "0.75rem",

      "--background": toOK(tokenBackgroundHex),
      "--foreground": toFG(tokenBackgroundHex),
      "--card": toOK(tokenCardHex),
      "--card-foreground": toFG(tokenCardHex),
      "--popover": toOK(tokenCardHex),
      "--popover-foreground": toFG(tokenCardHex),
      "--muted": toOK(tokenMutedHex),
      "--muted-foreground": toFG(tokenMutedHex),
      "--border": toOK(tokenBorderHex),
      "--input": toOK(tokenBorderHex),
      "--ring": toOK(tokenRingHex),

      "--neon-color": tokenPrimaryHex,
      "--neon-shadow": `0 0 12px ${tokenPrimaryHex}55, 0 0 24px ${tokenPrimaryHex}66`,
    };
    return cssVars as React.CSSProperties;
  }, [adv.themeTokens]);

  // Injecter les variables CSS directement dans :root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeVars).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(key, value);
      }
    });
  }, [themeVars]);

  // Calculer les valeurs finales pour les styles inline
  const finalColors = useMemo(() => {
    const tkn = adv.themeTokens;
    const tokenPrimaryHex = tkn.primary || "#3b82f6";
    const tokenSecondaryHex = tkn.secondary || "#64748b";
    const tokenAccentHex = tkn.accent || "#22c55e";
    const tokenBackgroundHex = tkn.background || "#ffffff";
    const tokenCardHex = tkn.card || "#ffffff";
    const tokenMutedHex = tkn.muted || "#f1f5f9";
    const tokenBorderHex = tkn.border || "#e5e7eb";
    const tokenRingHex = tkn.ring || "#94a3b8";

    const toOK = (hex: string) => hexToOklchString(hex);
    const toFG = (hex: string) => fgForHex(hex);

    return {
      primary: toOK(tokenPrimaryHex),
      primaryForeground: toFG(tokenPrimaryHex),
      secondary: toOK(tokenSecondaryHex),
      secondaryForeground: toFG(tokenSecondaryHex),
      accent: toOK(tokenAccentHex),
      accentForeground: toFG(tokenAccentHex),
      background: toOK(tokenBackgroundHex),
      foreground: toFG(tokenBackgroundHex),
      card: toOK(tokenCardHex),
      cardForeground: toFG(tokenCardHex),
      muted: toOK(tokenMutedHex),
      mutedForeground: toFG(tokenMutedHex),
      border: toOK(tokenBorderHex),
      ring: toOK(tokenRingHex),
      radius: tkn.radius ?? "0.75rem",
      neonColor: tokenPrimaryHex,
      neonShadow: `0 0 12px ${tokenPrimaryHex}55, 0 0 24px ${tokenPrimaryHex}66`
    };
  }, [adv.themeTokens]);

  const wrapperStyle: React.CSSProperties = useMemo(
    () => ({
      backgroundColor: "oklch(var(--background))",
      backgroundImage: bgGradient || undefined,
      backgroundAttachment: "fixed",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
    }),
    [bgGradient]
  );

  /* --------- Deadline: jour + heure ---------- */
  const Days = [
    { v: "sun", label: "Dimanche" },
    { v: "mon", label: "Lundi" },
    { v: "tue", label: "Mardi" },
    { v: "wed", label: "Mercredi" },
    { v: "thu", label: "Jeudi" },
    { v: "fri", label: "Vendredi" },
    { v: "sat", label: "Samedi" },
  ] as const;

  const [deadlineDay, setDeadlineDay] = useState<typeof Days[number]["v"]>("sun");
  const [deadlineTime, setDeadlineTime] = useState(adv.deadlineSundayUTC || "16:00");
  const [ondemandEmployees, setOndemandEmployees] = useState(75);

  useEffect(() => { setAdv((a) => ({ ...a, deadlineSundayUTC: deadlineTime })); }, [deadlineTime]);

  // Calcul du prix On-Demand avec dégressivité employé par employé
  function calculateOnDemandPrice(employees: number): number {
    if (employees <= 75) return 199.99;
    
    let totalPrice = 199.99; // Base pour 75 employés
    const extraEmployees = employees - 75;
    
    // Calcul employé par employé avec dégressivité progressive
    for (let i = 1; i <= extraEmployees; i++) {
      // Prix dégressif : commence à 5,00€ et diminue progressivement jusqu'à 1,75€
      // Sur 100 employés supplémentaires (75 à 175), le prix passe de 5,00€ à 1,75€
      const progress = Math.min(i / 100, 1); // Progression de 0 à 1 sur 100 employés
      const priceForThisEmployee = 5.00 - (5.00 - 1.75) * progress;
      totalPrice += priceForThisEmployee;
    }
    
    return totalPrice;
  }

  /* --------- Calcul pricing (USD) --------- */


  /* --------- UI render ---------- */

  return (
    <TooltipProvider delayDuration={150}>
      <div
        data-theme="preview"
        data-neon={neon ? "on" : "off"}
        className="min-h-screen w-full"
        style={wrapperStyle}
      >
        {/* Progress Stepper Premium */}
        <ProgressStepper currentStep={currentStep} totalSteps={totalSteps} />
        <style jsx>{`
          .neon-card { 
            box-shadow: 0 8px 32px ${finalColors.primary}14; 
          }
          .neon-card:hover { 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
          }
          [data-neon="on"] .neon-card { 
            box-shadow: 0 8px 32px ${finalColors.primary}40, 0 0 20px ${finalColors.primary}60 !important; 
          }
          [data-neon="on"] .neon-card:hover { 
            box-shadow: 0 20px 40px ${finalColors.primary}50, 0 0 30px ${finalColors.primary}70 !important; 
          }
          .time-input-center input[type="time"] {
            text-align: center;
          }
          .time-input-center input[type="time"]::-webkit-datetime-edit {
            text-align: center;
            width: 100%;
          }
          .time-input-center input[type="time"]::-webkit-datetime-edit-fields-wrapper {
            text-align: center;
            width: 100%;
          }
        `}</style>

        {/* Header avec système d'étapes */}
        <div className="relative z-10">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="text-center mb-12">
              <div className="inline-block p-6 backdrop-blur-xl border-2 shadow-2xl mb-6"
                   style={{ 
                     background: `linear-gradient(135deg, finalColors.card 0%, finalColors.muted 100%)`,
                     borderColor: `finalColors.border`,
                  boxShadow: `0 20px 40px oklch(var(--primary) / 0.1)`,
                  borderRadius: `var(--radius)`
                   }}>
                <h1 className="text-5xl font-black mb-4 flex items-center gap-4" style={{ color: finalColors.primary }}>
                  <Rocket className="w-12 h-12" />
                  Créer votre Agence
                </h1>
                <p className="text-xl font-medium" style={{ color: finalColors.mutedForeground }}>
                  En 4 étapes simples
                </p>
              </div>
              

              {/* Titre de l'étape actuelle */}
              <div className="mb-1">
                <h2 className="text-3xl font-bold mb-0" style={{ color: finalColors.foreground }}>
                  {steps[currentStep - 1]?.title}
                </h2>
                <p className="text-lg" style={{ color: finalColors.mutedForeground }}>
                  {steps[currentStep - 1]?.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal avec système d'étapes */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 pt-1">
          <div className="space-y-8 transition-all duration-500 ease-in-out">
            {/* Informations de base */}
            {currentStep === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8"
              >

                {/* Agence */}
                <ModernCard ref={setAnchor("s1")} finalColors={finalColors}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: finalColors.primary,
                           color: finalColors.primaryForeground
                         }}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold" style={{ color: finalColors.foreground }}>
                          Votre Agence
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Nom de l&apos;agence</b> : Le nom officiel qui sera affiché partout dans l&apos;interface.</p>
                              <p><b>Slug</b> : Généré automatiquement à partir du nom, utilisé dans les URLs et identifiants.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: finalColors.mutedForeground }}>
                        Nom officiel de votre agence
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: finalColors.foreground }}>
                        Nom de l&apos;agence *
                      </label>
                      <ModernInput
                        value={basic.agencyName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasic((b) => ({ ...b, agencyName: e.target.value }))}
                        placeholder="Ex: Mon Agence de Chat"
                        finalColors={finalColors}
                      />
                      <p className="text-xs mt-1" style={{ color: finalColors.mutedForeground }}>
                        Slug généré : <code className="px-2 py-1 rounded text-xs font-mono" 
                        style={{ 
                          backgroundColor: finalColors.muted,
                          color: finalColors.foreground,
                          border: `1px solid ${finalColors.border}`
                        }}>{basic.agencySlug || "—"}</code>
                      </p>
                    </div>
                  </div>
                </ModernCard>

                {/* Sous-domaine */}
                <ModernCard ref={setAnchor("s2")} finalColors={finalColors}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: finalColors.secondary,
                           color: finalColors.secondaryForeground
                         }}>
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                           Votre Sous-domaine
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Sous-domaine</b> : Nom court (3-30 caractères) qui formera votre URL : <code>monsousdomaine.qgchatting.com</code></p>
                              <p><b>Règles</b> : Seules lettres, chiffres et tirets. Ne peut pas commencer ou finir par un tiret.</p>
                              <p><b>Disponibilité</b> : Vérifiée automatiquement en temps réel.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Nom court pour personnaliser votre domaine
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                        Sous-domaine d&apos;agence *
                      </label>
                      <ModernInput
                        placeholder="monagence"
                        inputMode="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        pattern={SUBDOMAIN_PATTERN}
                        title="3–30 caractères, a-z, 0-9 et tirets (pas de tiret au début/fin)"
                        value={basic.subdomain}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBasic((b) => ({ ...b, subdomain: e.target.value.toLowerCase().trim() }))}
                        finalColors={finalColors}
                      />
                      <div className="mt-2">
                        {localSubError ? (
                          <div className="text-sm p-2 rounded bg-red-50 text-red-600 border border-red-200 flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            {basic.subdomain ? `${basic.subdomain}.${ROOT_DOMAIN} — ` : ""}{localSubError}
                          </div>
                        ) : fqdn ? (
                          <div className={`text-sm p-2 rounded border ${
                            vercelStatus === "ok" ? "bg-green-50 text-green-600 border-green-200" : 
                            vercelStatus === "checking" || vercelStatus === "idle" ? "bg-gray-50 text-gray-600 border-gray-200" : 
                            "bg-red-50 text-red-600 border-red-200"
                          }`}>
                            {vercelStatus === "ok" ? <CheckCircle className="w-4 h-4 inline mr-1" /> : vercelStatus === "checking" ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : vercelStatus === "taken" ? <XCircle className="w-4 h-4 inline mr-1" /> : vercelStatus === "error" ? <AlertTriangle className="w-4 h-4 inline mr-1" /> : ""} 
                            {fqdn} — {vercelStatus === "ok" ? "Disponible" : vercelStatus === "checking" ? "Vérification…" : vercelStatus === "taken" ? "Déjà pris" : vercelStatus === "error" ? "Erreur de vérification" : "—"}
                          </div>
                        ) : null}
                      </div>
                    </div>
                      
                    <div className="p-3 bg-blue-50 border border-blue-200 flex items-start gap-2"
                         style={{ borderRadius: `var(--radius)` }}>
                      <Info className="w-4 h-4 mt-0.5 text-blue-600" />
                      <p className="text-sm text-blue-700">
                        Ce sous-domaine sera provisionné sur <strong>{ROOT_DOMAIN}</strong>
                      </p>
                    </div>
                  </div>
                </ModernCard>

                {/* Branding */}
                <ModernCard ref={setAnchor("s3")} finalColors={finalColors}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: finalColors.accent,
                           borderRadius: finalColors.radius,
                           color: finalColors.accentForeground
                         }}>
                      <Palette className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                          Votre Branding
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Preset de thème</b> : Choisissez un thème prédéfini ou personnalisez entièrement.</p>
                              <p><b>Arrondi</b> : Contrôle le niveau d&apos;arrondi des éléments (sharp, soft, pill).</p>
                              <p><b>Effet néon</b> : Active des effets lumineux pour un look moderne.</p>
                              <p><b>Personnalisé</b> : Modifiez toutes les couleurs et paramètres manuellement.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Personnalisez l&apos;apparence de votre agence
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Contrôles principaux */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <label className="block text-lg font-bold flex items-center gap-2" style={{ color: finalColors.foreground }}>
                          <Palette className="w-5 h-5" />
                          Preset de thème
                        </label>
                          <select 
                            value={presetKey} 
                            onChange={(e) => setPresetKey(e.target.value as PresetKey)}
                            className="w-full px-4 py-3 text-lg font-medium transition-all duration-300 focus:scale-105"
                            style={{
                              borderRadius: finalColors.radius,
                              backgroundColor: finalColors.muted,
                              border: `2px solid ${finalColors.border}`,
                              color: finalColors.foreground,
                              boxShadow: `0 4px 15px ${finalColors.primary}20`
                            }}
                          >
                            {PRESETS.map((p) => (
                              <option key={p.key} value={p.key} style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                      <div className="space-y-4">
                        <label className="block text-lg font-bold flex items-center gap-2" style={{ color: finalColors.foreground }}>
                          <RefreshCw className="w-5 h-5" />
                          Arrondi
                        </label>
                          <select 
                            value={roundness} 
                            onChange={(e) => setRoundness(e.target.value as RoundnessKey)}
                            className="w-full px-4 py-3 text-lg font-medium transition-all duration-300 focus:scale-105"
                            style={{
                              borderRadius: finalColors.radius,
                              backgroundColor: finalColors.muted,
                              border: `2px solid ${finalColors.border}`,
                              color: finalColors.foreground,
                              boxShadow: `0 4px 15px ${finalColors.primary}20`
                            }}
                          >
                            <option value="sharp" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>Sharp (0.25rem)</option>
                            <option value="soft" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>Soft (0.75rem)</option>
                            <option value="pill" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>Pill (1.5rem)</option>
                          </select>
                        </div>

                      <div className="space-y-4">
                        <label className="block text-lg font-bold flex items-center gap-2" style={{ color: `finalColors.foreground` }}>
                          <Sparkles className="w-5 h-5" />
                          Effets
                        </label>
                        <div className="flex items-center gap-4 p-4 border-2"
                             style={{ 
                               backgroundColor: `finalColors.muted`,
                               borderRadius: `var(--radius)`
                             }}>
                          <input 
                            type="checkbox" 
                            checked={neon} 
                            onChange={(e) => setNeon(e.target.checked)}
                            className="w-5 h-5"
                            style={{ accentColor: `finalColors.primary` }}
                          />
                          <span className="text-lg font-medium" style={{ color: `finalColors.foreground` }}>
                            Neon glow
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Éditeur de thème personnalisé */}
                    {presetKey === "custom" && (
                      <div className="mt-6 p-6 border-2"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.5)`,
                             borderColor: `finalColors.primary`,
                             borderRadius: `var(--radius)`
                           }}>
                        <h4 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: `finalColors.foreground` }}>
                          <Palette className="w-5 h-5" />
                          Personnalisation avancée
                        </h4>
                        
                        <div className="space-y-6">
                          {/* Couleurs principales */}
                          <div>
                            <label className="block text-sm font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                              Couleurs principales
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: `finalColors.mutedForeground` }}>
                                  Primaire
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded border-2 cursor-pointer"
                                    style={{ borderColor: `finalColors.border` }}
                                    value={basic.primaryColor}
                                    onChange={(e) => {
                                      const hex = e.target.value;
                                      setBasic((b) => ({ ...b, primaryColor: hex }));
                                      setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, primary: hex } }));
                                    }} 
                                  />
                                  <span className="font-mono text-xs" style={{ color: `finalColors.foreground` }}>
                                    {basic.primaryColor}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: `finalColors.mutedForeground` }}>
                                  Secondaire
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded border-2 cursor-pointer"
                                    style={{ borderColor: `finalColors.border` }}
                                    value={adv.themeTokens.secondary ?? "#64748b"}
                                    onChange={(e) => setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, secondary: e.target.value } }))} 
                                  />
                                  <span className="font-mono text-xs" style={{ color: `finalColors.foreground` }}>
                                    {adv.themeTokens.secondary}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: `finalColors.mutedForeground` }}>
                                  Accent
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded border-2 cursor-pointer"
                                    style={{ borderColor: `finalColors.border` }}
                                    value={adv.themeTokens.accent ?? "#22c55e"}
                                    onChange={(e) => setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, accent: e.target.value } }))} 
                                  />
                                  <span className="font-mono text-xs" style={{ color: `finalColors.foreground` }}>
                                    {adv.themeTokens.accent}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Surfaces */}
                          <div>
                            <label className="block text-sm font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                              Surfaces
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: `finalColors.mutedForeground` }}>
                                  Background
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded border-2 cursor-pointer"
                                    style={{ borderColor: `finalColors.border` }}
                                    value={adv.themeTokens.background ?? "#ffffff"}
                                    onChange={(e) => setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, background: e.target.value } }))} 
                                  />
                                  <span className="font-mono text-xs" style={{ color: `finalColors.foreground` }}>
                                    {adv.themeTokens.background}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: `finalColors.mutedForeground` }}>
                                  Card
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded border-2 cursor-pointer"
                                    style={{ borderColor: `finalColors.border` }}
                                    value={adv.themeTokens.card ?? "#ffffff"}
                                    onChange={(e) => setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, card: e.target.value } }))} 
                                  />
                                  <span className="font-mono text-xs" style={{ color: `finalColors.foreground` }}>
                                    {adv.themeTokens.card}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium" style={{ color: `finalColors.mutedForeground` }}>
                                  Muted
                                </label>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded border-2 cursor-pointer"
                                    style={{ borderColor: `finalColors.border` }}
                                    value={adv.themeTokens.muted ?? "#f1f5f9"}
                                    onChange={(e) => setAdv((a) => ({ ...a, themeTokens: { ...a.themeTokens, muted: e.target.value } }))} 
                                  />
                                  <span className="font-mono text-xs" style={{ color: `finalColors.foreground` }}>
                                    {adv.themeTokens.muted}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ModernCard>

                {/* Préférences */}
                <ModernCard ref={setAnchor("s4")} finalColors={finalColors}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: `finalColors.primary`,
                           color: `finalColors.primaryForeground`
                         }}>
                      <Settings className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                           Vos Préférences
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Langue par défaut</b> : Langue de l&apos;interface pour tous les utilisateurs de l&apos;agence.</p>
                              <p><b>Fuseau horaire</b> : Actuellement fixé à UTC pour la cohérence des données.</p>
                              <p><b>Devise d&apos;affichage</b> : USD ($) - Dollar américain pour tous les montants.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Langue, devise et fuseau horaire
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                          Langue par défaut
                        </label>
                        <select 
                          value={basic.locale} 
                          onChange={(e) => setBasic((b) => ({ ...b, locale: e.target.value as "fr" | "en" }))}
                          className="w-full px-4 py-3 border-2 text-base"
                          style={{
                            borderRadius: finalColors.radius,
                            backgroundColor: finalColors.muted,
                            border: `2px solid ${finalColors.border}`,
                            color: finalColors.foreground,
                            boxShadow: `0 4px 15px ${finalColors.primary}20`
                          }}
                        >
                          <option value="fr" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>🇫🇷 Français</option>
                          <option value="en" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>🇬🇧 English</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                          Fuseau horaire
                        </label>
                        <div className="px-4 py-3 border-2 text-base flex items-center justify-center gap-2"
                             style={{
                               borderRadius: `var(--radius)`,
                               backgroundColor: `finalColors.muted`,
                               color: `finalColors.foreground`
                             }}>
                          <Globe className="w-4 h-4" />
                          UTC 
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                          Devise d&apos;affichage
                        </label>
                        <div className="px-4 py-3 border-2 text-base flex items-center justify-center gap-2"
                             style={{
                               borderRadius: `var(--radius)`,
                               backgroundColor: `finalColors.muted`,
                               color: `finalColors.foreground`
                             }}>
                          <DollarSign className="w-4 h-4" />
                          USD ($) 
                        </div>
                      </div>
                    </div>
                  </div>
                </ModernCard>
              </motion.div>
            )}

            {/* Configuration des équipes */}
            {currentStep === 2 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8"
              >

                {/* S7 – Shifts */}
                <div ref={setAnchor("s7")} className="bg-transparent p-8 shadow-lg border-2 relative overflow-hidden"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       boxShadow: `0 20px 40px ${finalColors.accent}20, 0 0 0 1px ${finalColors.border}`,
                       borderRadius: finalColors.radius
                     }}>
                  {/* Effet de fond décoratif */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
                       style={{ 
                         background: `radial-gradient(circle, ${finalColors.accent} 0%, transparent 70%)`,
                         transform: 'translate(50%, -50%)'
                       }} />
                  
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-16 h-16 flex items-center justify-center text-3xl shadow-lg"
                         style={{ 
                           background: `linear-gradient(135deg, finalColors.accent, oklch(var(--accent) / 0.8))`,
                           color: `finalColors.accentForeground`,
                           boxShadow: `0 8px 25px oklch(var(--accent) / 0.3)`
                         }}>
                      <Clock className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold mb-2" style={{ color: `finalColors.foreground` }}>
                            Vos Shifts Personnalisés
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Libellé</b> : Nom du créneau (ex: Matin, Soir, Nuit).</p>
                              <p><b>Début/Fin</b> : Heures de début et fin du créneau (format 24h).</p>
                              <p><b>Employés max</b> : Nombre maximum d&apos;employés pouvant travailler sur ce créneau.</p>
                              <p><b>Minuit</b> : Les créneaux traversant minuit sont supportés (ex: 23:00 → 07:00).</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-base" style={{ color: `finalColors.mutedForeground` }}>
                        Configurez vos créneaux de travail et la capacité maximale
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                    {/* En-têtes des colonnes */}
                    <div className="relative text-base font-semibold p-4 rounded-xl"
                         style={{ 
                           backgroundColor: `oklch(var(--muted) / 0.3)`,
                           border: `2px solid finalColors.border`
                         }}>
                      <div className="absolute top-3 bottom-3 flex items-center justify-start" style={{ left: '180px' }}>
                        <span style={{ color: `finalColors.foreground` }}>Libellé</span>
                      </div>
                      <div className="absolute top-3 bottom-3 flex items-center justify-center" style={{ left: 'calc(42.5% - 8px)' }}>
                        <span style={{ color: `finalColors.foreground` }}>Début</span>
                      </div>
                      <div className="absolute top-3 bottom-3 flex items-center justify-center" style={{ left: 'calc(62% - 8px)' }}>
                        <span style={{ color: `finalColors.foreground` }}>Fin</span>
                      </div>
                      <div className="absolute top-3 bottom-3 flex items-center justify-center" style={{ left: 'calc(77.777% - 8px)' }}>
                        <span style={{ color: `finalColors.foreground` }}>Employés max</span>
                      </div>
                    </div>
                    
                    {adv.shifts.map((s, i) => (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1.2fr_auto] gap-4 items-center p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.1)`,
                             borderColor: `finalColors.border`
                           }}>
                        <input 
                          value={s.label} 
                          onChange={(e) => updateShiftLabel(i, e.target.value)} 
                          placeholder="Libellé (ex: Matin)"
                          className="px-4 py-3 rounded-lg border-2 text-left font-medium transition-all duration-300 focus:scale-105 w-full"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                        <input 
                          type="time" 
                          value={minutesToHHmm(s.startMinutes)} 
                          onChange={(e) => updateShiftStart(i, e.target.value)} 
                          className="px-4 py-3 rounded-lg border-2 text-center font-medium transition-all duration-300 focus:scale-105 w-full"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                        <input 
                          type="time" 
                          value={minutesToHHmm(s.endMinutes)} 
                          onChange={(e) => updateShiftEnd(i, e.target.value)} 
                          className="px-4 py-3 rounded-lg border-2 text-center font-medium transition-all duration-300 focus:scale-105 w-full"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                        <input
                          type="number"
                          min={0}
                          value={getShiftCapacity(i)}
                          onChange={(e) => setShiftCapacity(i, parseInt(e.target.value || "0", 10))}
                          placeholder="Max"
                          className="px-4 py-3 rounded-lg border-2 text-center font-medium transition-all duration-300 focus:scale-105 w-full"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => removeShift(i)}
                            className="px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center"
                            style={{
                              backgroundColor: `oklch(var(--destructive))`,
                              color: `oklch(var(--destructive-foreground))`,
                              boxShadow: `0 4px 15px oklch(var(--destructive) / 0.3)`
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={addShift}
                        className="px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-110 shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, finalColors.primary, oklch(var(--primary) / 0.8))`,
                          color: `finalColors.primaryForeground`,
                          boxShadow: `0 8px 25px oklch(var(--primary) / 0.3)`
                        }}
                      >
                        ➕ Ajouter un shift
                      </button>
                    </div>
                    
                    <div className="text-center text-sm p-6 rounded-xl border-2 flex items-center justify-center gap-3"
                         style={{ 
                           backgroundColor: `oklch(var(--accent) / 0.1)`,
                           borderColor: `finalColors.accent`,
                           color: `finalColors.foreground`
                         }}>
                      <Lightbulb className="w-5 h-5" />
                      <div><strong>Astuce :</strong> Les horaires traversant minuit sont supportés (ex: 23:00 → 07:00)</div>
                    </div>
                  </div>
                </div>

                {/* S8 – Validation & Deadline */}
                <div ref={setAnchor("s8")} className="bg-transparent p-8 shadow-lg border-2 relative overflow-hidden"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       boxShadow: `0 20px 40px oklch(var(--secondary) / 0.1), 0 0 0 1px ${finalColors.border}`,
                       borderRadius: `var(--radius)`
                     }}>
                  {/* Effet de fond décoratif */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
                       style={{ 
                         background: `radial-gradient(circle, finalColors.secondary 0%, transparent 70%)`,
                         transform: 'translate(50%, -50%)'
                       }} />
                  
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-16 h-16 flex items-center justify-center text-3xl shadow-lg"
                         style={{ 
                           background: `linear-gradient(135deg, finalColors.secondary, oklch(var(--secondary) / 0.8))`,
                           color: `finalColors.secondaryForeground`,
                           boxShadow: `0 8px 25px oklch(var(--secondary) / 0.3)`
                         }}>
                      <Settings className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold mb-2" style={{ color: `finalColors.foreground` }}>
                          Vos Règles & Deadlines
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Validation automatique</b> : Valide les soumissions si toutes les règles sont respectées (capacité max, délais, etc.).</p>
                              <p><b>Deadline</b> : Date/heure limite (UTC) au-delà de laquelle les soumissions passent en retard.</p>
                              <p><b>Jour/Heure</b> : Configurez le jour de la semaine et l&apos;heure exacte de la deadline.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-base" style={{ color: `finalColors.mutedForeground` }}>
                        Configuration de la validation automatique et des délais
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="flex items-center gap-4 cursor-pointer">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={adv.autoApproveRules}
                              onChange={(e) => setAdv((a) => ({ ...a, autoApproveRules: e.target.checked }))}
                              className="w-6 h-6 rounded-lg border-2 cursor-pointer"
                              style={{
                                backgroundColor: adv.autoApproveRules ? `finalColors.primary` : 'transparent',
                                borderColor: `finalColors.primary`
                              }}
                            />
                            {adv.autoApproveRules && (
                              <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                              Validation automatique
                            </div>
                            <div className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                              Valide automatiquement si toutes les règles sont respectées
                            </div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <div>
                          <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                            Jour de deadline (UTC)
                          </label>
                          <select 
                            value={deadlineDay} 
                            onChange={(e) => setDeadlineDay(e.target.value as typeof deadlineDay)}
                            className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                            style={{
                              borderRadius: finalColors.radius,
                              backgroundColor: finalColors.muted,
                              border: `2px solid ${finalColors.border}`,
                              color: finalColors.foreground,
                              boxShadow: `0 4px 15px ${finalColors.primary}20`
                            }}
                          >
                            {Days.map((d) => (
                              <option key={d.v} value={d.v} style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>{d.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <div>
                          <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                            Heure de deadline (UTC)
                          </label>
                          <input 
                            type="time" 
                            value={deadlineTime} 
                            onChange={(e) => setDeadlineTime(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                            style={{
                              boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center p-6 rounded-xl border-2"
                         style={{ 
                           backgroundColor: `oklch(var(--secondary) / 0.1)`,
                           borderColor: `finalColors.secondary`,
                           color: `finalColors.foreground`
                         }}>
                      <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Exemple de configuration
                      </div>
                      <div className="text-base">
                        Deadline : <strong>{Days.find((d) => d.v === deadlineDay)?.label}</strong> à <strong>{deadlineTime}</strong> UTC
                      </div>
                    </div>
                  </div>
                </div>

                {/* S9 – Paie */}
                <div ref={setAnchor("s9")} className="bg-transparent p-8 shadow-lg border-2 relative overflow-hidden"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       boxShadow: `0 20px 40px ${finalColors.accent}20, 0 0 0 1px ${finalColors.border}`,
                       borderRadius: finalColors.radius
                     }}>
                  {/* Effet de fond décoratif */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
                       style={{ 
                         background: `radial-gradient(circle, ${finalColors.accent} 0%, transparent 70%)`,
                         transform: 'translate(50%, -50%)'
                       }} />
                  
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-16 h-16 flex items-center justify-center text-3xl shadow-lg"
                         style={{ 
                           background: `linear-gradient(135deg, finalColors.accent, oklch(var(--accent) / 0.8))`,
                           color: `finalColors.accentForeground`,
                           boxShadow: `0 8px 25px oklch(var(--accent) / 0.3)`
                         }}>
                      <DollarSign className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold mb-2" style={{ color: `finalColors.foreground` }}>
                           Votre Gestion des Paies
                        </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Taux horaire</b> : Rémunération fixe par heure travaillée (optionnel).</p>
                              <p><b>% de partage du CA</b> : Pourcentage du chiffre d&apos;affaires partagé entre les employés.</p>
                              <p><b>Combinaison</b> : Vous pouvez activer les deux modes de rémunération simultanément.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-base" style={{ color: `finalColors.mutedForeground` }}>
                        Configuration des modalités de rémunération
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                    <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                         style={{ 
                           backgroundColor: `oklch(var(--muted) / 0.3)`,
                           borderColor: `finalColors.border`
                         }}>
                      <label className="flex items-center gap-4 cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={adv.payroll.hourlyEnabled}
                            onChange={(e) => setAdv((a) => ({ ...a, payroll: { ...a.payroll, hourlyEnabled: e.target.checked } }))}
                            className="w-6 h-6 rounded-lg border-2 cursor-pointer"
                            style={{
                              backgroundColor: adv.payroll.hourlyEnabled ? `finalColors.primary` : 'transparent',
                              borderColor: `finalColors.primary`
                            }}
                          />
                          {adv.payroll.hourlyEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                              ✓
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                            Taux horaire activé
                          </div>
                          <div className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                            Active la rémunération basée sur les heures travaillées
                          </div>
                        </div>
                      </label>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {adv.payroll.hourlyEnabled && (
                        <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                             style={{ 
                               backgroundColor: `oklch(var(--muted) / 0.3)`,
                               borderColor: `finalColors.border`
                             }}>
                          <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                            Taux horaire ($/heure)
                          </label>
                          <input 
                            type="number" 
                            placeholder="4.5" 
                            min={0}
                            value={adv.payroll.hourlyUSD ?? ""}
                            onChange={(e) => setAdv((a) => ({
                              ...a,
                              payroll: { ...a.payroll, hourlyUSD: e.target.value ? Math.max(0, parseFloat(e.target.value)) : null },
                            }))}
                            className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                            style={{
                              boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                          % de partage du CA
                        </label>
                        <input 
                          type="number" 
                          min={0}
                          max={100}
                          value={adv.payroll.revenueSharePercent}
                          onChange={(e) => setAdv((a) => ({
                            ...a,
                            payroll: { ...a.payroll, revenueSharePercent: clamp01(parseFloat(e.target.value || "0")) },
                          }))}
                          className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strikes */}
                <div ref={setAnchor("s10")} className="bg-transparent p-8 shadow-lg border-2 relative overflow-hidden"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       boxShadow: `0 20px 40px oklch(var(--destructive) / 0.1), 0 0 0 1px finalColors.border`,
                       borderRadius: `var(--radius)`
                     }}>
                  {/* Effet de fond décoratif */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
                       style={{ 
                         background: `radial-gradient(circle, oklch(var(--destructive)) 0%, transparent 70%)`,
                         transform: 'translate(50%, -50%)'
                       }} />
                  
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-16 h-16 flex items-center justify-center text-3xl shadow-lg"
                         style={{ 
                           background: `linear-gradient(135deg, oklch(var(--destructive)), oklch(var(--destructive) / 0.8))`,
                           color: `oklch(var(--destructive-foreground))`,
                           boxShadow: `0 8px 25px oklch(var(--destructive) / 0.3)`
                         }}>
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold" style={{ color: `finalColors.foreground` }}>
                           Votre Politique de Strikes
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Grâce</b> : Temps de retards toloré avant pénalité.</p>
                              <p><b>Pénalités</b> : Réduction de salaire pour retard/absence.</p>
                              <p><b>Top pool</b> : Pourcentage du CA partagé entre les meilleurs employés.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-base" style={{ color: `finalColors.mutedForeground` }}>
                        Configuration des pénalités et du système de strikes
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                          Période de grâce (min)
                        </label>
                        <input 
                          type="number" 
                          min={0} 
                          value={adv.strike.graceMinutes}
                          onChange={(e) => setAdv((a) => ({ ...a, strike: { ...a.strike, graceMinutes: Math.max(0, parseInt(e.target.value || "0", 10)) } }))}
                          className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                      </div>
                      
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                          Pénalité retard ($)
                        </label>
                        <input 
                          type="number" 
                          min={0} 
                          value={adv.strike.lateFeeUSD}
                          onChange={(e) => setAdv((a) => ({ ...a, strike: { ...a.strike, lateFeeUSD: Math.max(0, parseFloat(e.target.value || "0")) } }))}
                          className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                      </div>
                      
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="block text-lg font-semibold mb-3" style={{ color: `finalColors.foreground` }}>
                          Pénalité absence ($)
                        </label>
                        <input 
                          type="number" 
                          min={0} 
                          value={adv.strike.absenceFeeUSD}
                          onChange={(e) => setAdv((a) => ({ ...a, strike: { ...a.strike, absenceFeeUSD: Math.max(0, parseFloat(e.target.value || "0")) } }))}
                          className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                          style={{
                            boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-center p-6 rounded-xl border-2"
                         style={{ 
                           backgroundColor: `oklch(var(--destructive) / 0.1)`,
                           borderColor: `oklch(var(--destructive))`,
                           color: `finalColors.foreground`
                         }}>
                      <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Information importante
                      </div>
                      <div className="text-sm">
                        Les pénalités sont directement retirées du salaire de l&apos;employé et comptabilisées dans le pool des strikes pour répartition aux employés les plus assidus.
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Fonctionnalités avancées */}
            {currentStep === 3 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8"
              >

                {/* Compétition */}
                <div ref={setAnchor("s12")} className="bg-transparent p-8 shadow-lg border-2"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       borderRadius: `var(--radius)`
                     }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: `finalColors.accent`,
                           borderRadius: `var(--radius)`,
                           color: `finalColors.accentForeground`
                         }}>
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                         Votre Compétitivité Inter-Agences
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Alias public</b> : Nom affiché dans le classement inter-agences (optionnel).</p>
                              <p><b>Classement</b> : Basé sur les performances de votre agence.</p>
                              <p><b>Opt-in</b> : Votre agence choisit de participer ou non.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Système de compétition entre agences
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                         style={{ 
                           backgroundColor: `oklch(var(--muted) / 0.3)`,
                           borderColor: `finalColors.border`
                         }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                             style={{ 
                               backgroundColor: `finalColors.accent`,
                               color: `finalColors.accentForeground`
                             }}>
                          <Trophy className="w-4 h-4" />
                        </div>
                        <h4 className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                          Participation à la compétition inter-agences
                        </h4>
                </div>

                      <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={adv.competition.optIn}
                            onChange={(e) => setAdv((a) => ({ 
                              ...a, 
                              competition: { ...a.competition, optIn: e.target.checked } 
                            }))}
                            className="w-5 h-5 rounded border-2"
                     style={{ 
                              backgroundColor: `oklch(var(--background))`,
                              borderColor: `finalColors.border`
                            }}
                          />
                          <span className="text-sm font-medium" style={{ color: `finalColors.foreground` }}>
                            Activer la compétition inter-agences
                          </span>
                        </label>
                        
                        {adv.competition.optIn && (
                          <div className="mt-4 space-y-3">
                            <label className="block">
                              <span className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                                Alias public (optionnel)
                              </span>
                              <input
                                type="text"
                                value={adv.competition.alias || ""}
                                onChange={(e) => setAdv((a) => ({ 
                                  ...a, 
                                  competition: { ...a.competition, alias: e.target.value } 
                                }))}
                                placeholder="Ex: MonAgence2024"
                                className="w-full px-4 py-3 border-2 text-base"
                                style={{
                                  borderRadius: `var(--radius)`,
                                  backgroundColor: `finalColors.muted`,
                                  color: `finalColors.foreground`
                                }}
                              />
                              <p className="text-xs mt-1" style={{ color: `finalColors.mutedForeground` }}>
                                Ce nom sera affiché dans les classements inter-agences
                              </p>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Telegram */}
                <div ref={setAnchor("s11")} className="bg-transparent p-8 shadow-lg border-2"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       borderRadius: `var(--radius)`
                     }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: `finalColors.secondary`,
                           color: `finalColors.secondaryForeground`
                         }}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                          Votre Groupe Telegram
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Canal Telegram</b> : ID du canal pour recevoir les notifications.</p>
                              <p><b>Digest quotidien</b> : Résumé envoyé chaque jour à 08:00 UTC.</p>
                              <p><b>Notifications</b> : Alertes en temps réel pour les événements importants.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Configuration des notifications Telegram
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                        Channel ID
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border-2 text-base"
                        style={{
                          backgroundColor: `finalColors.muted`,
                          color: `finalColors.foreground`
                        }}
                        value={adv.telegram.channelId || ""}
                        onChange={(e) => setAdv((a) => ({ ...a, telegram: { ...a.telegram, channelId: e.target.value } }))}
                        placeholder="Ex: @moncanal"
                      />
                    </div>
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={adv.telegram.dailyDigest}
                        onChange={(e) => setAdv((a) => ({ ...a, telegram: { ...a.telegram, dailyDigest: e.target.checked } }))}
                        className="w-5 h-5"
                      />
                      <span className="text-sm" style={{ color: `finalColors.foreground` }}>
                        Digest quotidien (08:00 UTC)
                      </span>
                    </label>
                  </div>
                </div>

                {/* S6 – Sécurité */}
                <div ref={setAnchor("s6")} className="bg-transparent rounded-2xl p-8 shadow-lg border-2 relative overflow-hidden"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                       boxShadow: `0 20px 40px oklch(var(--primary) / 0.1), 0 0 0 1px finalColors.border`
                     }}>
                  {/* Effet de fond décoratif */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
                       style={{ 
                         background: `radial-gradient(circle, finalColors.primary 0%, transparent 70%)`,
                         transform: 'translate(50%, -50%)'
                       }} />
                  
                  <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-16 h-16 flex items-center justify-center text-3xl shadow-lg"
                         style={{ 
                           background: `linear-gradient(135deg, oklch(var(--destructive)), oklch(var(--destructive) / 0.8))`,
                           color: `oklch(var(--destructive-foreground))`,
                           boxShadow: `0 8px 25px oklch(var(--destructive) / 0.3)`
                         }}>
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-bold" style={{ color: `finalColors.foreground` }}>
                          Vos choix en matière de Sécurité
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Email vérifié</b> : Exige une vérification d&apos;email pour les nouveaux employés.</p>
                              <p><b>2FA</b> : Recommande l&apos;authentification à deux facteurs.</p>
                              <p><b>Protection</b> : Sécurise l&apos;accès à votre agence et aux données sensibles.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-base" style={{ color: `finalColors.mutedForeground` }}>
                        Configuration des paramètres de sécurité pour protéger votre agence
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="flex items-center gap-4 cursor-pointer">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={adv.enforceVerifiedEmail}
                              onChange={(e) => setAdv((a) => ({ ...a, enforceVerifiedEmail: e.target.checked }))}
                              className="w-6 h-6 rounded-lg border-2 cursor-pointer"
                              style={{
                                backgroundColor: adv.enforceVerifiedEmail ? `finalColors.primary` : 'transparent',
                                borderColor: `finalColors.primary`
                              }}
                            />
                            {adv.enforceVerifiedEmail && (
                              <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                              Email vérifié requis
                            </div>
                            <div className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                              Tous les employés doivent avoir un email vérifié
                            </div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                           style={{ 
                             backgroundColor: `oklch(var(--muted) / 0.3)`,
                             borderColor: `finalColors.border`
                           }}>
                        <label className="flex items-center gap-4 cursor-pointer">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={adv.suggest2FA}
                              onChange={(e) => setAdv((a) => ({ ...a, suggest2FA: e.target.checked }))}
                              className="w-6 h-6 rounded-lg border-2 cursor-pointer"
                              style={{
                                backgroundColor: adv.suggest2FA ? `finalColors.primary` : 'transparent',
                                borderColor: `finalColors.primary`
                              }}
                            />
                            {adv.suggest2FA && (
                              <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                              Suggérer 2FA
                            </div>
                            <div className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                              Recommander l&apos;activation de l&apos;authentification à deux facteurs
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Finalisation */}
            {currentStep === 4 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-8"
              >

                {/* S5 – Plan & Billing */}
                <div ref={setAnchor("s5")} className="bg-transparent rounded-2xl p-8 shadow-lg border-2"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                     }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: `finalColors.primary`,
                           color: `finalColors.primaryForeground`
                         }}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                           Votre Plan Personnalisé
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Plan</b> : Choisissez le plan qui correspond à vos besoins.</p>
                              <p><b>Facturation</b> : Emails qui recevront les factures (votre email ajouté automatiquement).</p>
                              <p><b>Paiement</b> : Configuration des méthodes de paiement acceptées.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Choisissez votre plan et configurez la facturation
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Sélection du plan */}
                    <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                         style={{ 
                           backgroundColor: `oklch(var(--muted) / 0.3)`,
                           borderColor: `finalColors.border`
                         }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                             style={{ 
                               backgroundColor: `finalColors.primary`,
                               color: `finalColors.primaryForeground`
                             }}>
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <h4 className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                          Sélection du plan
                        </h4>
                </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { 
                            key: "starter", 
                            name: "Starter", 
                            price: "59,99$/mois", 
                            features: ["17 employés", "4 modèles", "Toutes les fonctionnalités"] 
                          },
                          { 
                            key: "advanced", 
                            name: "Advanced", 
                            price: "119,99$/mois", 
                            features: ["35 employés", "7 modèles", "Toutes les fonctionnalités"] 
                          },
                          { 
                            key: "professional", 
                            name: "Professional", 
                            price: "199,99$/mois", 
                            features: ["75 employés", "Modèles illimités", "Toutes les fonctionnalités"] 
                          },
                          { 
                            key: "on_demand", 
                            name: "On-Demand", 
                            price: "199,99$/mois", 
                            features: ["≥75 employés", "Modèles illimités", "Toutes les fonctionnalités", "Tarification dégressif"] 
                          }
                        ].map((plan) => (
                          <label key={plan.key} className="cursor-pointer">
                            <input
                              type="radio"
                              name="plan"
                              value={plan.key}
                              checked={adv.planKey === plan.key}
                              onChange={(e) => setAdv((a) => ({ ...a, planKey: e.target.value as "starter" | "advanced" | "professional" | "on_demand" }))}
                              className="sr-only"
                            />
                            <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                              adv.planKey === plan.key ? 'ring-2 ring-primary' : ''
                            }`}
                                 style={{
                                   backgroundColor: adv.planKey === plan.key ? `oklch(var(--primary) / 0.1)` : `oklch(var(--muted) / 0.3)`,
                                   borderColor: adv.planKey === plan.key ? `finalColors.primary` : `finalColors.border`
                                 }}>
                              <div className="text-center">
                                <h5 className="text-lg font-bold mb-2" style={{ color: `finalColors.foreground` }}>
                                  {plan.name}
                                </h5>
                                <p className="text-2xl font-bold mb-3" style={{ color: `finalColors.primary` }}>
                                  {plan.price}
                                </p>
                                <ul className="text-sm space-y-1" style={{ color: `finalColors.mutedForeground` }}>
                                  {plan.features.map((feature, i) => (
                                    <li key={i}>• {feature}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      {/* Simulateur On-Demand */}
                      {adv.planKey === "on_demand" && (
                        <div className="mt-6 p-6 rounded-xl border-2"
                             style={{ 
                               backgroundColor: `oklch(var(--accent) / 0.1)`,
                               borderColor: `finalColors.accent`
                             }}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="text-2xl">🧮</div>
                            <h5 className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                              Simulateur de tarification On-Demand
                            </h5>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-semibold mb-2" style={{ color: `finalColors.foreground` }}>
                                Nombre d&apos;employés
                              </label>
                              <input
                                type="number"
                                min="75"
                                max="500"
                                value={ondemandEmployees}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Permettre la saisie de n'importe quoi temporairement
                                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                    setOndemandEmployees(Number(value) || 0);
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!value || value < 75) {
                                    setOndemandEmployees(75);
                                  }
                                }}
                                onWheel={(e) => e.preventDefault()}
                                className="w-full px-4 py-3 rounded-lg border-2 text-lg font-medium"
                                style={{
                                  backgroundColor: `finalColors.muted`,
                                  color: `finalColors.foreground`
                                }}
                              />
                              <p className="text-xs mt-1" style={{ color: `finalColors.mutedForeground` }}>
                                Minimum : 75 employés
                              </p>
                              {ondemandEmployees < 75 && (
                                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: `oklch(var(--destructive))` }}>
                                  <AlertTriangle className="w-3 h-3" />
                                  Le minimum est de 75 employés pour le plan On-Demand
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <div className="p-4 rounded-lg" style={{ backgroundColor: `oklch(var(--background))` }}>
                                <div className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                                  Prix mensuel estimé
                                </div>
                                <div className="text-3xl font-bold" style={{ color: `finalColors.primary` }}>
                                  ${calculateOnDemandPrice(ondemandEmployees).toFixed(2)}
                                </div>
                              </div>
                              
                              {ondemandEmployees > 75 && (
                                <div className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                                  <div>Base : $199.99 (75 employés)</div>
                                  <div>Supplément : ${(calculateOnDemandPrice(ondemandEmployees) - 199.99).toFixed(2)} ({ondemandEmployees - 75} employés supplémentaires)</div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: `oklch(var(--muted) / 0.3)` }}>
                            <div className="font-semibold mb-1 flex items-center gap-2" style={{ color: `finalColors.foreground` }}>
                              <Lightbulb className="w-4 h-4" />
                              Tarification dégressif employé par employé
                            </div>
                            <div style={{ color: `finalColors.mutedForeground` }}>
                              • Dégressivité progressive jusuqu&apos;à $1.75 par employé<br/>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Emails de facturation */}
                    <div className="p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105"
                         style={{ 
                           backgroundColor: `oklch(var(--muted) / 0.3)`,
                           borderColor: `finalColors.border`
                         }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                             style={{ 
                               backgroundColor: `finalColors.secondary`,
                               color: `finalColors.secondaryForeground`
                             }}>
                          <Mail className="w-4 h-4" />
                        </div>
                        <h4 className="text-lg font-semibold" style={{ color: `finalColors.foreground` }}>
                          Emails de facturation
                        </h4>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                          Ajoutez les emails qui recevront les factures (votre email sera ajouté automatiquement)
                        </p>
                        
                        <div className="space-y-2">
                          {adv.billingEmails.map((email, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                  const newEmails = [...adv.billingEmails];
                                  newEmails[index] = e.target.value;
                                  setAdv((a) => ({ ...a, billingEmails: newEmails }));
                                }}
                                className="flex-1 px-3 py-2 rounded-lg border-2 text-sm"
                                style={{
                                  backgroundColor: `finalColors.muted`,
                                  color: `finalColors.foreground`
                                }}
                                placeholder="email@exemple.com"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newEmails = adv.billingEmails.filter((_, i) => i !== index);
                                  setAdv((a) => ({ ...a, billingEmails: newEmails }));
                                }}
                                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                  backgroundColor: `oklch(var(--destructive))`,
                                  color: `oklch(var(--destructive-foreground))`
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setAdv((a) => ({ ...a, billingEmails: [...a.billingEmails, ""] }))}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            backgroundColor: `finalColors.primary`,
                            color: `finalColors.primaryForeground`
                          }}
                        >
                          + Ajouter un email
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invitations */}
                <div ref={setAnchor("s13")} className="bg-transparent rounded-2xl p-8 shadow-lg border-2"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                     }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: `finalColors.accent`,
                           borderRadius: `var(--radius)`,
                           color: `finalColors.accentForeground`
                         }}>
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                          Invitées vos Employées
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Optionnel</b> : Vous pouvez inviter vos employés maintenant ou plus tard.</p>
                              <p><b>Emails</b> : Saisissez les adresses email de vos employés.</p>
                              <p><b>Rôles</b> : Définissez les permissions de chaque employé.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Invitez vos premiers employés
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Liste des invitations */}
                    <div className="space-y-4">
                      {adv.invitations?.map((invitation, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-xl border-2"
                             style={{ 
                               backgroundColor: `oklch(var(--muted) / 0.1)`,
                               borderColor: `finalColors.border`
                             }}>
                          <div className="flex-1">
                            <input
                              type="email"
                              value={invitation.email}
                              onChange={(e) => {
                                const newInvitations = [...(adv.invitations || [])];
                                newInvitations[index] = { ...newInvitations[index], email: e.target.value };
                                setAdv({ ...adv, invitations: newInvitations });
                              }}
                              placeholder="Email de l&apos;employé"
                              className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                              style={{
                                boxShadow: `0 4px 15px oklch(var(--primary) / 0.1)`
                              }}
                            />
                          </div>
                          <div className="w-48">
                            <select
                              value={invitation.role}
                              onChange={(e) => {
                                const newInvitations = [...(adv.invitations || [])];
                                newInvitations[index] = { ...newInvitations[index], role: e.target.value as "admin" | "manager" | "employee" };
                                setAdv({ ...adv, invitations: newInvitations });
                              }}
                              className="w-full px-4 py-3 rounded-lg border-2 font-medium transition-all duration-300 focus:scale-105"
                              style={{
                                borderRadius: finalColors.radius,
                                backgroundColor: finalColors.muted,
                                border: `2px solid ${finalColors.border}`,
                                color: finalColors.foreground,
                                boxShadow: `0 4px 15px ${finalColors.primary}20`
                              }}
                            >
                              <option value="employee" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>Employé</option>
                              <option value="manager" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>Manager</option>
                              <option value="admin" style={{ backgroundColor: finalColors.card, color: finalColors.foreground }}>Administrateur</option>
                            </select>
                          </div>
                          <button
                            onClick={() => {
                              const newInvitations = adv.invitations?.filter((_, i) => i !== index) || [];
                              setAdv({ ...adv, invitations: newInvitations });
                            }}
                            className="px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-110 shadow-lg"
                            style={{
                              backgroundColor: `oklch(var(--destructive))`,
                              color: `oklch(var(--destructive-foreground))`,
                              boxShadow: `0 4px 15px oklch(var(--destructive) / 0.3)`
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      ))}
                </div>

                    {/* Bouton ajouter invitation */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          const newInvitations = [...(adv.invitations || []), { email: "", role: "employee" as const }];
                          setAdv({ ...adv, invitations: newInvitations });
                        }}
                        className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                        style={{
                          backgroundColor: `finalColors.primary`,
                          color: `finalColors.primaryForeground`,
                          boxShadow: `0 4px 15px oklch(var(--primary) / 0.3)`
                        }}
                      >
                        + Ajouter un employé
                      </button>
                    </div>
                    
                    {/* Message d'information */}
                    <div className="p-4 rounded-xl"
                         style={{ 
                           backgroundColor: `oklch(var(--muted) / 0.3)`,
                           border: `2px solid finalColors.border`
                         }}>
                      <div className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Information
                      </div>
                      <div className="text-sm">
                        Vous pouvez inviter vos employés maintenant ou plus tard depuis le tableau de bord. 
                        Les invitations seront envoyées par email avec un lien d&apos;activation.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publier */}
                <div ref={setAnchor("s14")} className="bg-transparent rounded-2xl p-8 shadow-lg border-2"
                     style={{ 
                       backgroundColor: finalColors.card,
                       borderColor: finalColors.border,
                     }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl"
                         style={{ 
                           backgroundColor: `finalColors.primary`,
                           color: `finalColors.primaryForeground`
                         }}>
                      <Rocket className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold" style={{ color: `finalColors.foreground` }}>
                           Publier votre Agence
                      </h3>
                        <Tooltip delayDuration={150}>
                          <TooltipTrigger className="shrink-0" aria-label="Aide">
                            <HelpCircle className="w-5 h-5" style={{ color: finalColors.mutedForeground }} />
                          </TooltipTrigger>
                          <TooltipContent side="right" align="start" collisionPadding={12} className="max-w-sm text-sm">
                            <div className="space-y-1">
                              <p><b>Création</b> : Votre agence sera créée avec toutes les configurations.</p>
                              <p><b>Thème</b> : Votre thème personnalisé sera sauvegardé.</p>
                              <p><b>Finalisation</b> : Dernière étape pour rendre votre agence opérationnelle.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm" style={{ color: `finalColors.mutedForeground` }}>
                        Finalisez et publiez votre agence
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {errors.length > 0 && (
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                        <div className="font-medium mb-1">Problèmes détectés :</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {errors.map((e, i) => (<li key={i} className="marker:text-destructive">{e}</li>))}
                        </ul>
                        <div className="mt-2 text-xs text-muted-foreground">Utilisez le menu de gauche pour corriger chaque section.</div>
                      </div>
                    )}

                    <ModernButton 
                      className="w-full h-14 text-lg"
                      onClick={onPublish} 
                      disabled={submitting}
                    >
                      {submitting ? "Publication en cours…" : "Terminer & Publier l&apos;agence"}
                    </ModernButton>
                    <p className="text-sm text-center" style={{ color: `finalColors.mutedForeground` }}>
                      En cas d&apos;échec : un résumé par section s&apos;affiche ci-dessus.
                    </p>
                  </div>
                </div>

              </motion.div>
            )}

            {/* Navigation entre étapes */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t-2"
                 style={{ borderColor: `finalColors.border` }}>
              <ModernButton
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                variant="secondary"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Précédent
              </ModernButton>
              
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: `finalColors.foreground` }}>
                  {steps[currentStep - 1]?.title}
                </p>
              </div>
              
              <ModernButton
                onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                disabled={currentStep === totalSteps}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant →
              </ModernButton>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
