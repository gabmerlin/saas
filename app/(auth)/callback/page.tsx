'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

// Empêche la tentative de prerender statique et évite les erreurs de CSR bailout
export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  useEffect(() => {
    const run = async () => {
      // 1) Hash fragment envoyé par Supabase (#access_token=...&refresh_token=...)
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      // 2) Query string (?sub=xxx) qu'on a ajouté côté invite
      const qs = new URLSearchParams(window.location.search);
      const sub = qs.get('sub') ?? undefined;

      // 3) Créer la session client
      if (access_token && refresh_token) {
        await supabaseBrowser().auth.setSession({ access_token, refresh_token });
      }

      // 4) Redirection finale
      const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com';
      if (sub) {
        window.location.replace(`https://${sub}.${root}/fr`);
      } else {
        window.location.replace('/fr');
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="rounded-md border p-4 bg-white shadow-sm">Connexion en cours…</div>
    </main>
  );
}
