'use client';

import * as React from 'react';
import { useMemo, useEffect, useState } from 'react';
import { onboardingSchema } from '@/lib/validation/onboarding';

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN!;

type CheckState = { status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'; domain?: string; };

export default function OwnerOnboardingPage() {
  const [agencyName, setAgencyName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [sub, setSub] = useState('');
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => {
    const s = sub.trim().toLowerCase();
    return s ? `${s}.${rootDomain}` : `—.${rootDomain}`;
  }, [sub]);

  useEffect(() => {
    setMessage(null);
    const s = sub.trim().toLowerCase();
    if (!s) return setCheck({ status: 'idle' });

    const re = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    if (!re.test(s) || s === 'www') {
      setCheck({ status: 'invalid', domain: `${s}.${rootDomain}` });
      return;
    }

    let active = true;
    setCheck({ status: 'checking', domain: `${s}.${rootDomain}` });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenants/domains/check?sub=${encodeURIComponent(s)}`);
        const json = await res.json();
        if (!active) return;
        if (!res.ok || !json?.ok) return setCheck({ status: 'error', domain: `${s}.${rootDomain}` });
        setCheck({ status: json.available ? 'available' : 'taken', domain: json.domain });
      } catch {
        if (active) setCheck({ status: 'error', domain: `${s}.${rootDomain}` });
      }
    }, 350);
    return () => { active = false; clearTimeout(t); };
  }, [sub]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = onboardingSchema.safeParse({
      agencyName, ownerEmail, language, subdomain: sub.trim().toLowerCase()
    });
    if (!parsed.success) {
      setMessage('Données invalides. Corrige le formulaire.');
      return;
    }
    if (check.status === 'taken') {
      setMessage('Ce sous-domaine est déjà utilisé.');
      return;
    }
    if (check.status === 'invalid') {
      setMessage('Sous-domaine invalide.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          subdomain: parsed.data.subdomain,
          tenantName: parsed.data.agencyName,
          ownerEmail: parsed.data.ownerEmail,
          locale: parsed.data.language
        })
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const msg = json?.code === 'domain_exists' ? 'Ce sous-domaine est déjà utilisé.' : 'Échec du provisioning.';
        setMessage(`${msg} (code: ${json?.code ?? 'unknown'})`);
        return;
      }
      window.location.href = `https://${parsed.data.subdomain}.${rootDomain}/${language}`;
    } catch {
      setMessage('Erreur réseau pendant le provisioning.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Onboarding Owner</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Nom de l’agence</label>
          <input className="w-full rounded-md border px-3 py-2" value={agencyName} onChange={(e)=>setAgencyName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email du propriétaire</label>
          <input type="email" className="w-full rounded-md border px-3 py-2" value={ownerEmail} onChange={(e)=>setOwnerEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Langue</label>
          <select className="w-full rounded-md border px-3 py-2" value={language} onChange={(e)=>setLanguage(e.target.value as 'fr'|'en')}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sous-domaine</label>
          <input className="w-full rounded-md border px-3 py-2" value={sub} onChange={(e)=>setSub(e.target.value)} placeholder="monagence" required />
          <div className="mt-2 text-sm"><span className="opacity-70">Aperçu :</span> <span className="font-mono">{preview}</span></div>
          <div className="mt-2">
            {check.status === 'idle' && <span className="text-gray-500 text-sm">Saisis un sous-domaine…</span>}
            {check.status === 'checking' && <span className="text-blue-600 text-sm">Vérification…</span>}
            {check.status === 'available' && <span className="text-green-700 text-sm">✅ Disponible</span>}
            {check.status === 'taken' && <span className="text-red-700 text-sm">⛔ Déjà pris</span>}
            {check.status === 'invalid' && <span className="text-orange-700 text-sm">⚠️ Invalide (www interdit, a–z 0–9 -)</span>}
            {check.status === 'error' && <span className="text-red-700 text-sm">Erreur de vérification</span>}
          </div>
        </div>
        {message && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</div>}
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50" disabled={submitting || check.status === 'checking'}>
          {submitting ? 'Provisioning…' : 'Créer & Provisionner'}
        </button>
      </form>
    </div>
  );
}
