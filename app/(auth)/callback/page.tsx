'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      const qs = new URLSearchParams(window.location.search);
      const sub = qs.get('sub') ?? undefined;

      if (access_token && refresh_token) {
        await supabaseBrowser().auth.setSession({ access_token, refresh_token });
      }

      const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'qgchatting.com';
      if (sub) window.location.replace(`https://${sub}.${root}/fr`);
      else window.location.replace('/fr');
    };
    run();
  }, []);

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="rounded-md border p-4 bg-white shadow-sm">Connexion en cours…</div>
    </main>
  );
}
