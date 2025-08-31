'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const run = async () => {
      // 1) Lire le fragment d’URL (#access_token=...&refresh_token=...)
      const frag = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      const hash = new URLSearchParams(frag);
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      // 2) Créer la session côté client
      if (access_token && refresh_token) {
        const supabase = supabaseBrowser();
        await supabase.auth.setSession({ access_token, refresh_token });
      }

      // 3) Redirection
      const sub = search.get('sub'); // transmis par l’API onboarding
      const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com';

      if (sub) {
        // plus tard: /fr/dashboard
        window.location.href = `https://${sub}.${root}/fr`;
        return;
      }
      router.replace('/fr');
    };
    run();
  }, [router, search]);

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="rounded-md border p-4">Connexion en cours…</div>
    </main>
  );
}
