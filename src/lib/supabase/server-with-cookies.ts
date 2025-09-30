import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const supabaseServer = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({
            name,
            value,
            ...options,
            domain: ".qgchatting.com",   // ✅ permet partage entre sous-domaines
            sameSite: "lax",             // ✅ adapté pour les sous-domaines
            secure: process.env.NODE_ENV === "production", // ✅ obligatoire en prod HTTPS
            httpOnly: false,             // ✅ accessible côté client
            path: "/",                   // ✅ disponible sur tout le site
          });
        },
        remove(name: string, options: any) {
          cookieStore.set({
            name,
            value: "",
            maxAge: 0,
            ...options,
            domain: ".qgchatting.com",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: false,
            path: "/",
          });
        },
      },
    }
  );
};
