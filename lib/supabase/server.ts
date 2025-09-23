import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type Opts = { serviceRole?: boolean };

export function createClient(opts?: Opts): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = opts?.serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseClient(url, key, {
    auth: { 
      persistSession: false, 
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: { 
      headers: { 'x-application-name': 'qgchatting-saas' } 
    }
  });
}


// Fonction pour créer un client avec les cookies de session
export async function createClientWithSession(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const cookieStore = await cookies();
  
  
  // Récupération des cookies de session Supabase (essayer différents noms)
  const possibleCookies = [
    'sb-ndlmzwwfwugtwpmebdog-auth-token',
    'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
    'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
    'supabase-auth-token',
    'sb-auth-token'
  ];
  
  let sessionData: string | { access_token: string; refresh_token?: string } | string[] | null = null;
  
  for (const cookieName of possibleCookies) {
    const cookie = cookieStore.get(cookieName);
    if (cookie?.value) {
      try {
        sessionData = JSON.parse(cookie.value);
        break;
      } catch {
        sessionData = cookie.value;
        break;
      }
    }
  }
  
  const supabase = createSupabaseClient(url, key, {
    auth: { 
      persistSession: false, 
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce'
    },
    global: { 
      headers: { 'x-application-name': 'qgchatting-saas' } 
    }
  });

  // Si on a des données de session, on les utilise
  if (sessionData) {
    try {
      if (Array.isArray(sessionData) && sessionData.length > 0) {
        const accessToken = sessionData[0];
        const refreshToken = sessionData[1] || sessionData[0];
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      } else if (typeof sessionData === 'string') {
        await supabase.auth.setSession({
          access_token: sessionData,
          refresh_token: sessionData
        });
      } else if (typeof sessionData === 'object' && sessionData && 'access_token' in sessionData) {
        await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token || sessionData.access_token
        });
      }
    } catch {
      // Ignore session setup errors
    }
  }

  return supabase;
}
