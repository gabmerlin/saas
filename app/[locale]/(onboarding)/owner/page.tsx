'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type ApiOk = {
  ok: true;
  tenant: { id: string; name: string; subdomain: string; locale: string };
  owner_email: string;
  invite_sent: boolean;
  next: string;
};
type ApiErr = { ok: false; error: unknown };
type ApiResult = ApiOk | ApiErr;

const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const reserved = new Set(['www','api','app','admin','owner','mail','ftp','vercel','static','assets']);

export default function OwnerOnboardingPage() {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ApiResult | null>(null);

  const [available, setAvailable] = useState<null | boolean>(null);
  const [checking, setChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com';

  // Vérif disponibilité sous-domaine avec debounce 400ms
  useEffect(() => {
    setAvailable(null);
    if (!subdomain || !subdomainRegex.test(subdomain) || reserved.has(subdomain)) return;

    setChecking(true);
    const t = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const r = await fetch(`/api/onboarding/check-subdomain?q=${encodeURIComponent(subdomain)}`, { signal: ctrl.signal });
        const j = (await r.json()) as { ok: boolean; available?: boolean };
        setAvailable(j.ok ? !!j.available : null);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [subdomain]);

  const subdomainHint = useMemo(() => {
    if (!subdomain) return 'ex: monagence';
    if (!subdomainRegex.test(subdomain)) return 'Le sous-domaine ne respecte pas le format.';
    if (reserved.has(subdomain)) return 'Sous-domaine réservé.';
    if (checking) return 'Vérification…';
    if (available === true) return 'Disponible ✅';
    if (available === false) return 'Déjà pris ❌';
    return '';
  }, [subdomain, checking, available]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRes(null);
    if (!name || !email || !subdomainRegex.test(subdomain) || reserved.has(subdomain)) return;
    if (available === false) return;

    setLoading(true);
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
          <input
            className="border rounded-md p-2"
            value={subdomain}
            onChange={e => setSubdomain(e.target.value.toLowerCase())}
            required
            pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
          />
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <code>{(subdomain || 'monagence')}.{root}</code>
            <span>• {subdomainHint}</span>
          </div>
        </label>

        <label className="grid gap-1">
          <span className="text-sm">Email Owner</span>
          <input type="email" className="border rounded-md p-2" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>

        <button
          disabled={loading || available === false}
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {loading ? 'Création…' : 'Créer et inviter'}
        </button>

        <div className="text-xs text-gray-500">
          Besoin d’aide ? <Link className="underline" href="/fr">Retour accueil</Link>
        </div>

        {res && (
          <div className="mt-2 text-sm">
            {res.ok ? (
              <div className="rounded-md border p-3 bg-green-50">
                <div className="font-medium">Agence créée ✅</div>
                <div>Sous-domaine : <code>{res.tenant.subdomain}.{root}</code></div>
                <div>Owner invité : <code>{res.owner_email}</code> {res.invite_sent ? '(email envoyé)' : '(invitation non envoyée)'}</div>
                <div className="mt-2">
                  <a className="underline" href={res.next} target="_blank" rel="noreferrer">Ouvrir l’agence</a>
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
