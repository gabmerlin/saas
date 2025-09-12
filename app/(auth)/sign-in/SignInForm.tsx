"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Props = { next: string };

// ⚠️ IMPORTANT : on utilise le client "auth-helpers" côté client
// pour que le login crée/maj les cookies lisibles par le middleware.
const supabase = createClientComponentClient();

export default function SignInForm({ next }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;                 // ✅ anti double-submit
    setSubmitting(true);
    setMsg(null);

    const MAX_TRIES = 3;
    let attempt = 0;
    let lastErr: Error | null = null;

    while (attempt < MAX_TRIES) {
      attempt++;
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error) {
        // ✅ Cookies écrits par auth-helpers -> middleware les voit
        window.location.replace(next || "/dashboard");
        return;
      }

      lastErr = error;
      const status = (lastErr as any)?.status ?? (lastErr as any)?.statusCode ?? 0;

      if (status === 429) {
        const waitMs = attempt * 1500;      // 1.5s, 3s…
        setMsg(`Trop de tentatives. Nouvel essai dans ${(waitMs/1000).toFixed(1)}s…`);
        await sleep(waitMs);
        continue;
      } else {
        break;
      }
    }

    const human =
      (lastErr as any)?.status === 429
        ? "Trop de tentatives, réessaie dans 30–60 secondes."
        : (lastErr?.message || "Échec de connexion.");
    setMsg(human);
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3"
      autoComplete="off"
      data-lpignore="true"      // limite l’injection d’icônes par LastPass & co
      data-form-type="other"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          inputMode="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          data-lpignore="true"
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Mot de passe</label>
        <input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          data-lpignore="true"
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}

      <button
        type="submit"
        className="w-full h-10 rounded bg-black text-white disabled:opacity-60"
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
