'use client';

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';

const re: RegExp = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/; // validateur côté client

export default function OwnerOnboardingPage() {
  const [sub, setSub] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    const s = sub.trim().toLowerCase();
    if (!re.test(s) || s === 'www') {
      setMsg('Sous-domaine invalide (lettres/chiffres, tirets au milieu, 3–63).');
      return;
    }

    setBusy(true);
    try {
      // On passe par le wrapper serveur pour ne jamais exposer le secret
      const res = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subdomain: s }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        domain?: string;
      };

      if (!res.ok || data.ok === false) {
        setMsg(`Erreur ${res.status} : ${data?.error ?? 'échec'}`);
        return;
      }

      setMsg(`✅ Provisionné : ${data.domain}`);
      // Ex: redirection une fois prêt
      // window.location.href = `https://${data.domain}/fr`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMsg(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-2">Onboarding Owner</h1>
      <p className="text-muted-foreground mb-6">
        Crée un tenant, associe l’owner et provisionne un sous-domaine.
      </p>

      <div className="rounded-lg border p-4 mb-6">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Créer le tenant en base</li>
          <li>Associer l’owner (user courant)</li>
          <li>
            Appeler POST <code>/api/tenants/provision</code>
          </li>
          <li>Rediriger vers le sous-domaine une fois prêt</li>
        </ol>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Sous-domaine</span>
          <input
            className="mt-1 w-full rounded border p-2"
            placeholder="ex: monagence"
            // ⚠️ pas de RegExp dans les attributs — on valide en JS
            inputMode="text"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={63}
            value={sub}
            onChange={(e) => setSub(e.target.value)}
          />
        </label>

        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={busy}
        >
          {busy ? 'Provisionnement…' : 'Provisionner'}
        </button>

        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </form>

      <p className="mt-6 text-sm">
        <Link className="underline" href="/api/health">
          /api/health
        </Link>
      </p>
    </main>
  );
}
