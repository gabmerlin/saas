'use client';

import { createBrowserClient } from '@supabase/ssr';

// Instance globale avec flow implicit (sans PKCE)
let globalSupabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createGlobalSupabaseClient() {
  if (!globalSupabaseInstance) {
    globalSupabaseInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit' as const
        },
        cookies: {
          get(name: string) {
            if (typeof window !== 'undefined') {
              return document.cookie
                .split('; ')
                .find(row => row.startsWith(`${name}=`))
                ?.split('=')[1] || undefined;
            }
            return undefined;
          },
          set(name: string, value: string, options: any) {
            if (typeof window !== 'undefined') {
              const cookieString = `${name}=${value}; domain=.qgchatting.com; path=/; ${
                process.env.NODE_ENV === "production" ? "secure; " : ""
              }samesite=lax; max-age=${options?.maxAge || 60 * 60 * 24 * 7}`;
              document.cookie = cookieString;
            }
          },
          remove(name: string, options: any) {
            if (typeof window !== 'undefined') {
              document.cookie = `${name}=; domain=.qgchatting.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }
          },
        },
      }
    );

    // Flow implicit - pas de PKCE nécessaire
  }
  
  return globalSupabaseInstance;
}

// Rediriger vers le client force-implicit
export { 
  supabaseForceImplicit as supabaseBrowserWithCookies,
  supabaseForceImplicit as supabaseBrowser,
  supabaseForceImplicit as supabaseBrowserWithPKCEFixed
} from './client-force-implicit';
