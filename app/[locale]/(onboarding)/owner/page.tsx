"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const SUBDOMAIN_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export default function OwnerOnboardingPage() {
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!SUBDOMAIN_RE.test(subdomain)) {
      alert("Sous-domaine invalide");
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      alert("Non authentifié");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/onboarding/owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        name,
        subdomain: subdomain.toLowerCase(),
        locale: "fr",
      }),
    });

    const json: { ok?: boolean; redirect?: string; error?: string } = await res.json();
    setLoading(false);

    if (!res.ok || !json.ok) {
      alert(json.error || "Erreur lors de la création");
      return;
    }
    // Redirection vers le nouveau sous-domaine
    window.location.href = String(json.redirect);
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Onboarding — Owner</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nom de l’agence</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Dazz"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Sous-domaine</label>
          <div className="flex">
            <input
              className="flex-1 border rounded-l-lg px-3 py-2"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              pattern={SUBDOMAIN_RE.source}
              title="minuscules, chiffres, tirets; pas de tiret début/fin"
              placeholder="ex: dazz"
              required
            />
            <span className="inline-flex items-center border border-l-0 rounded-r-lg px-3">
              .{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer l’agence"}
        </button>
      </form>
    </div>
  );
}
