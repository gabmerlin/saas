import { createClient } from '@supabase/supabase-js';

export const supabaseBrowserWithCookies = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key: string) => {
            if (typeof window !== 'undefined') {
              return document.cookie
                .split('; ')
                .find(row => row.startsWith(`${key}=`))
                ?.split('=')[1] || null;
            }
            return null;
          },
          setItem: (key: string, value: string) => {
            if (typeof window !== 'undefined') {
              const cookieString = `${key}=${value}; domain=.qgchatting.com; path=/; ${
                process.env.NODE_ENV === "production" ? "secure; " : ""
              }samesite=lax; max-age=${60 * 60 * 24 * 7}`;
              document.cookie = cookieString;
            }
          },
          removeItem: (key: string) => {
            if (typeof window !== 'undefined') {
              document.cookie = `${key}=; domain=.qgchatting.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            }
          },
        },
      },
    }
  );
};
