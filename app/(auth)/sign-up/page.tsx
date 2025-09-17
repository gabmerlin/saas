"use client";

import { useMemo, useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { MessageSquare, Shield, Users, Zap, CheckCircle, AlertCircle } from "lucide-react";

const SignupSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
  username: z
    .string()
    .min(3, "Au moins 3 caractères")
    .max(32, "Au plus 32 caractères")
    .regex(/^[a-z0-9-_.]+$/i, "Caractères autorisés : lettres/chiffres/._-"),
});

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

function SignUpContent() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const invitationToken = searchParams?.get("invitation");
  const next = searchParams?.get("next") ?? "/dashboard";
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  
  // Définir le titre de la page
  usePageTitle("Inscription - QG Chatting");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    role: string;
    tenantName: string;
  } | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);

  // Récupérer les détails de l'invitation si un token est fourni
  useEffect(() => {
    if (invitationToken) {
      setLoadingInvitation(true);
      fetch(`/api/invitations/check?token=${invitationToken}`)
        .then(res => res.json())
        .then(data => {
          if (data.invitation) {
            setInvitationData({
              email: data.invitation.email,
              role: data.invitation.role_key,
              tenantName: data.invitation.tenant?.name || 'Agence'
            });
            // Préremplir l'email
            setForm(prev => ({ ...prev, email: data.invitation.email }));
          } else {
            setGlobalError('Invitation invalide ou expirée');
          }
        })
        .catch(() => {
          setGlobalError('Erreur lors de la vérification de l\'invitation');
        })
        .finally(() => {
          setLoadingInvitation(false);
        });
    }
  }, [invitationToken]);

  // Jauge de robustesse (0..5)
  const score = useMemo(() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p)) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }, [form.password]);

  const scorePct = (score / 5) * 100;
  const scoreLabel =
    score <= 1 ? "Très faible" :
    score === 2 ? "Faible" :
    score === 3 ? "Moyen" :
    score === 4 ? "Fort" : "Très fort";

  function validateLocal(): FieldErrors {
    const errs: FieldErrors = {};
    const parsed = SignupSchema.safeParse(form);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FieldErrors;
        if (!errs[k]) errs[k] = issue.message;
      }
    }
    if (!errs.password && form.password !== confirm) {
      errs.confirm = "Les mots de passe ne correspondent pas.";
    }
    return errs;
  }

  async function checkAvailability(email: string, username: string) {
    const r = await fetch("/api/auth/check-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) throw new Error("Vérification indisponible");
    return j as { emailTaken: boolean; usernameTaken: boolean };
  }

  async function submit() {
    setGlobalError(null);
    setGlobalSuccess(null);

    // 1) validation locale
    const localErrs = validateLocal();
    setFieldErrors(localErrs);
    if (Object.keys(localErrs).length) return;

    // 2) vérification serveur (email + username)
    try {
        const a = await checkAvailability(form.email, form.username);
        const fe: FieldErrors = {};
        if (a.emailTaken) fe.email = "Cet email est déjà utilisé.";
        if (a.usernameTaken) fe.username = "Ce pseudo est déjà pris.";
        if (Object.keys(fe).length) { setFieldErrors(fe); return; }
    } catch {
        setGlobalError("Impossible de vérifier la disponibilité. Réessaie.");
        return;
    }

    // 3) inscription
    setLoading(true);
    try {
        // Si il y a une invitation, utiliser l'API spéciale
        if (invitationToken) {
          const response = await fetch('/api/auth/signup-with-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: form.email,
              password: form.password,
              username: form.username,
              invitationToken: invitationToken
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            if (data.error?.includes('déjà utilisé') || data.error?.includes('already')) {
              setFieldErrors({ email: "Cet email est déjà utilisé." });
              return;
            }
            setGlobalError(data.error || "Erreur lors de la création du compte");
            return;
          }

          // Rediriger vers le dashboard du tenant
          if (data.tenant?.subdomain) {
            window.location.href = `https://${data.tenant.subdomain}.qgchatting.com/dashboard`;
            return;
          } else {
            // Fallback vers la page de connexion
            window.location.replace(`/sign-in?next=${encodeURIComponent(next)}`);
            return;
          }
        }

        // Inscription normale (sans invitation)
        const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
            data: { username: form.username },
            emailRedirectTo:
            typeof window !== "undefined"
                ? `${window.location.origin}/callback?next=%2Ffr%2Fowner`
                : undefined,
        },
        });

        if (signUpError) {
        const msg = signUpError.message || "";
        if (/already\s+registered|user\s+already|email.*exists/i.test(msg)) {
            setFieldErrors({ email: "Cet email est déjà utilisé." });
            return;
        }
        if (/rate\s*limit|too\s*many/i.test(msg)) {
            setGlobalError("Trop de tentatives, réessaie dans quelques minutes.");
            return;
        }
        if (/invalid.*email/i.test(msg)) {
            setFieldErrors({ email: "Adresse email invalide." });
            return;
        }
        if (/weak.*password|password/i.test(msg)) {
            setFieldErrors({ password: "Mot de passe trop faible (ex. Password1!)." });
            return;
        }
        // fallback : inconnu
        setGlobalError("Une erreur est survenue. Réessaie plus tard.");
        return;
        }
        
        // Redirection directe vers la page de connexion
        window.location.replace(`/sign-in?next=${encodeURIComponent(next)}`);
        return;
    } catch {
        setGlobalError("Problème réseau. Vérifie ta connexion et réessaie.");
    } finally {
        setLoading(false);
    }
    }

  const onChangeField =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [key]: e.target.value });
      setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
      setGlobalError(null);
      setGlobalSuccess(null);
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold">QG Chatting</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                {invitationData ? `Rejoignez ${invitationData.tenantName}` : "Créez votre agence"}
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                {invitationData 
                  ? "Vous avez été invité à rejoindre une équipe. Créez votre compte pour commencer à collaborer."
                  : "Lancez votre agence et transformez la façon dont vos équipes communiquent et collaborent."
                }
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Sécurité Enterprise</h3>
                  <p className="text-blue-100 text-sm">Chiffrement de bout en bout</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Collaboration Avancée</h3>
                  <p className="text-blue-100 text-sm">Outils intégrés pour vos équipes</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Performance Optimisée</h3>
                  <p className="text-blue-100 text-sm">Interface rapide et intuitive</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Right side - Sign Up Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {invitationData ? `Rejoindre ${invitationData.tenantName}` : "Créer un compte"}
                </h2>
                <p className="text-gray-600">
                  {invitationData ? "Créez votre compte pour rejoindre l'équipe" : "Commencez votre aventure avec QG Chatting"}
                </p>
              </div>
        
              {loadingInvitation && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Vérification de l&apos;invitation...</p>
                </div>
              )}
              
              {invitationData && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Invitation reçue</h3>
                  </div>
                  <div className="text-sm text-blue-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Email :</span>
                      <span>{invitationData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Rôle :</span>
                      <span className="capitalize">{invitationData.role}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Agence :</span>
                      <span>{invitationData.tenantName}</span>
                    </div>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); submit(); }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Pseudo (username)</label>
                  <Input
                    name="username"
                    autoComplete="username"
                    value={form.username}
                    onChange={onChangeField("username")}
                    placeholder="ex: gabriel"
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? "err-username" : undefined}
                  />
                  <p className="text-xs text-gray-500">
                    3–32 caractères, lettres/chiffres/._-
                  </p>
                  {fieldErrors.username && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span id="err-username">{fieldErrors.username}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={invitationData ? undefined : onChangeField("email")}
                    placeholder="you@example.com"
                    disabled={!!invitationData}
                    className={`h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg ${
                      invitationData ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "err-email" : undefined}
                  />
                  {invitationData && (
                    <p className="text-xs text-blue-600 flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Email fourni par l&apos;invitation de {invitationData.tenantName}</span>
                    </p>
                  )}
                  {fieldErrors.email && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span id="err-email">{fieldErrors.email}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                  <Input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={onChangeField("password")}
                    placeholder="••••••••"
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? "err-password" : "pw-help"
                    }
                  />
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          score <= 1 ? "bg-red-500" :
                          score === 2 ? "bg-orange-500" :
                          score === 3 ? "bg-yellow-500" :
                          score === 4 ? "bg-blue-500" : "bg-green-500"
                        }`}
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p id="pw-help" className="text-xs text-gray-500">
                        Robustesse : <span className={`font-medium ${
                          score <= 1 ? "text-red-600" :
                          score === 2 ? "text-orange-600" :
                          score === 3 ? "text-yellow-600" :
                          score === 4 ? "text-blue-600" : "text-green-600"
                        }`}>{scoreLabel}</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Au moins 8 caractères, Chiffre, Majuscule, Minuscule, Symbole.
                    </p>
                  </div>
                  {fieldErrors.password && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span id="err-password">{fieldErrors.password}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                  <Input
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setFieldErrors((fe) => ({ ...fe, confirm: undefined }));
                      setGlobalError(null);
                      setGlobalSuccess(null);
                    }}
                    placeholder="••••••••"
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    aria-invalid={!!fieldErrors.confirm}
                    aria-describedby={fieldErrors.confirm ? "err-confirm" : undefined}
                  />
                  {fieldErrors.confirm && (
                    <div className="flex items-center space-x-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      <span id="err-confirm">{fieldErrors.confirm}</span>
                    </div>
                  )}
                </div>

                {globalError && (
                  <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span role="alert" aria-live="polite">{globalError}</span>
                  </div>
                )}
                {globalSuccess && (
                  <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span role="status" aria-live="polite">{globalSuccess}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Création...</span>
                    </div>
                  ) : (
                    invitationData ? "Rejoindre l'équipe" : "Créer mon compte"
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Un email de confirmation peut être requis selon la configuration.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}