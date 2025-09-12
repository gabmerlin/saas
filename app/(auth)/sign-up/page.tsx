"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const next = searchParams?.get("next") ?? "/dashboard";
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

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
    <div className="min-h-[60vh] grid place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-xl font-semibold">Créer un compte (Owner)</h1>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm">Pseudo (username)</label>
            <Input
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={onChangeField("username")}
              placeholder="ex: gabriel"
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? "err-username" : undefined}
            />
            <p className="text-xs text-muted-foreground mt-1">
              3–32 caractères, lettres/chiffres/._-
            </p>
            {fieldErrors.username && (
              <p id="err-username" className="text-xs text-red-600 mt-1">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm">Email</label>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={onChangeField("email")}
              placeholder="you@example.com"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "err-email" : undefined}
            />
            {fieldErrors.email && (
              <p id="err-email" className="text-xs text-red-600 mt-1">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm">Mot de passe</label>
            <Input
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={onChangeField("password")}
              placeholder="••••••••"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={
                fieldErrors.password ? "err-password" : "pw-help"
              }
            />
            <div className="mt-2">
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-2 rounded bg-primary"
                  style={{ width: `${scorePct}%` }}
                />
              </div>
              <p id="pw-help" className="text-xs text-muted-foreground mt-1">
                Robustesse : {scoreLabel}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Au moins 8 caractères, Chiffre, Majuscule, Minuscule, Symbole.</p>
            {fieldErrors.password && (
              <p id="err-password" className="text-xs text-red-600 mt-1">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm">Confirmer le mot de passe</label>
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
              aria-invalid={!!fieldErrors.confirm}
              aria-describedby={fieldErrors.confirm ? "err-confirm" : undefined}
            />
            {fieldErrors.confirm && (
              <p id="err-confirm" className="text-xs text-red-600 mt-1">
                {fieldErrors.confirm}
              </p>
            )}
          </div>

          {globalError && (
            <p className="text-sm text-red-600" role="alert" aria-live="polite">
              {globalError}
            </p>
          )}
          {globalSuccess && (
            <p className="text-sm text-green-600" role="status" aria-live="polite">
              {globalSuccess}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Création..." : "Créer mon compte"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Un email de confirmation peut être requis selon la configuration.
          </p>
        </form>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
