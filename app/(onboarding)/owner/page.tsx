'use client';

import { useState } from 'react';

type ApiResult =
  | { ok: true; tenant: { id: string; name: string; subdomain: string; locale: string }; owner_email: string; invite_sent: boolean; next: string }
  | { ok: false; error: unknown };

export default function OwnerOnboardingPage() {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ApiResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch('/api/onboarding/owner', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, subdomain: subdomain.toLowerCase(), email, locale: 'fr' })
      });
      const j = (await r.json()) as ApiResult;
      setRes(j);
    } catch (err) {
      setRes({ ok: false, error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com';

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-lg rounded-xl border p-6 bg-white shadow-sm grid gap-4">
        <h1 className="text-2xl font-bold">Créer ton agence</h1>

        <label className="grid gap-1">
          <span className="text-sm">Nom de l’agence</span>
          <input className="border rounded-md p-2" value={name} onChange={e => setName(e.target.value)} required />
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Sous-domaine</span>
          <input className="border rounded-md p-2" value={subdomain} onChange={e => setSubdomain(e.target.value)} required pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$" />
          <span className="text-xs text-gray-500">{subdomain || 'monagence'}.{root}</span>
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Email Owner</span>
          <input type="email" className="border rounded-md p-2" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>

        <button disabled={loading} className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
          {loading ? 'Création…' : 'Créer et inviter'}
        </button>

        {res && (
          <div className="mt-2 text-sm">
            {res.ok ? (
              <div className="rounded-md border p-3 bg-green-50">
                <div className="font-medium">Agence créée ✅</div>
                <div>Sous-domaine : <code>{res.tenant.subdomain}.{root}</code></div>
                <div>Owner invité : <code>{res.owner_email}</code> {res.invite_sent ? '(email envoyé)' : '(invitation non envoyée)'}</div>
                <div className="mt-2">
                  <a className="underline" href={res.next} target="_blank">Ouvrir l’agence</a>
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-3 bg-red-50">
                <div className="font-medium">Erreur</div>
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(res.error, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </form>
    </main>
  );
}
