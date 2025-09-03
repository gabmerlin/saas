'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Availability =
  | { ok: true; available: true; fqdn: string }
  | { ok: true; available: false; fqdn: string; reason: string }
  | { ok: false; error: string };

const reSub = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/; // 2..63, tirets au milieu, 'www' interdit
const ROOT =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ??
  (typeof window !== 'undefined' ? window.location.hostname.split('.').slice(-2).join('.') : 'qgchatting.com');

export default function OwnerOnboardingPage() {
  const [sub, setSub] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [check, setCheck] = useState<Availability | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const normalized = useMemo(() => sub.trim().toLowerCase(), [sub]);
  const valid = useMemo(() => reSub.test(normalized) && normalized !== 'www', [normalized]);
  const fqdn = useMemo(() => `${normalized}.${ROOT}`, [normalized]);

  // Vérif de disponibilité (debounce 300ms) quand "valid"
  useEffect(() => {
    setCheck(null);
    if (!valid) return;

    const ab = new AbortController();
    ctrl.current?.abort();
    ctrl.current = ab;

    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tenants/domains?subdomain=${encodeURIComponent(normalized)}`, {
          method: 'GET',
          signal: ab.signal,
          cache: 'no-store',
        });
        const data: Availability = await r.json();
        setCheck(data);
      } catch (e) {
        setCheck({ ok: false, error: 'Vérification indisponible' });
      }
    }, 300);

    return () => {
      clearTimeout(t);
      ab.abort();
    };
  }, [valid, normalized]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    if (!valid) {
      setMsg('Sous-domaine invalide (lettres/chiffres, tirets au milieu, 2–63, "www" interdit).');
      return;
    }
    if (check?.ok && check.available === false) {
      setMsg(`Ce sous-domaine est déjà utilisé (${check.fqdn}).`);
      return;
    }

    setBusy(true);
    try {
      // Passe par le WRAPPER serveur (ne divulgue pas le secret)
      const res = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subdomain: normalized }),
      });
      const data = (await res.json()) as { ok?: boolean; domain?: string; error?: string };
      if (!res.ok || data?.ok === false) {
        setMsg(data?.error ?? `Erreur ${res.status}`);
        return;
      }
      setMsg(`✅ Provisionné : ${data.domain}`);
      // Redirige si souhaité :
      // window.location.href = `https://${data.domain}/fr`;
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg(m);
    } finally {
      setBusy(false);
    }
  }

  const availabilityText = (() => {
    if (!valid) return 'Sous-domaine invalide.';
    if (!check) return 'Vérification…';
    if (!check.ok) return 'Vérification indisponible.';
    if (check.available) return 'Disponible ✅';
    return `Déjà pris ❌ (${check.fqdn})`;
  })();

  const canSubmit =
    valid &&
    (check?.ok ? check.available === true : true) &&
    !busy;

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-2">Onboarding Owner</h1>
      <p className="text-muted-foreground mb-6">
        Crée un tenant, associe l’owner et provisionne un sous-domaine.
      </p>

      <div className="rounded-lg border p-4 mb-6">
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Créer le tenant en base</li>
          <li>Associer l’owner (user courant)</li>
          <li>Vérifier la disponibilité du sous-domaine</li>
          <li>Appeler POST <code>/api/tenants/provision</code></li>
          <li>Rediriger vers le sous-domaine</li>
        </ol>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Sous-domaine</span>
          <input
            className="mt-1 w-full rounded border p-2"
            placeholder="ex: monagence"
            inputMode="text"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={63}
            value={sub}
            onChange={(e) => setSub(e.target.value)}
          />
        </label>

        {/* Aperçu immédiat */}
        <div className="text-sm">
          <div className="text-muted-foreground">Aperçu domaine :</div>
          <div className={valid ? 'text-green-600' : 'text-red-600'}>
            https://{normalized || 'xxxxx'}.{ROOT}
          </div>
          <div className="mt-1 text-xs">{availabilityText}</div>
        </div>

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={!canSubmit}
        >
          {busy ? 'Provisionnement…' : 'Provisionner'}
        </button>

        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </form>

      {/* Exemple de lien interne correct (Link), éviter <a> vers pages Next */}
      <p className="mt-6 text-sm">
        <Link className="underline" href="/fr">Accueil</Link>
      </p>
    </main>
  );
}
