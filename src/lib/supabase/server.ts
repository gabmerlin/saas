import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SUPABASE_SERVER_CONFIG } from './config';

type Opts = { serviceRole?: boolean };

export function createClient(opts?: Opts): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = opts?.serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createSupabaseClient(url, key, SUPABASE_SERVER_CONFIG);
}

export async function createClientWithSession(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createSupabaseClient(url, key, SUPABASE_SERVER_CONFIG);

  try {
    const cookieStore = await cookies();
    
    // Chercher les cookies de session Supabase
    const cookieNames = [
      'sb-ndlmzwwfwugtwpmebdog-auth-token',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
      'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
      'supabase-auth-token'
    ];
    
    for (const cookieName of cookieNames) {
      const cookie = cookieStore.get(cookieName);
      if (cookie?.value) {
        try {
          const sessionData = JSON.parse(cookie.value);
          if (sessionData && sessionData.access_token) {
            await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token || sessionData.access_token
            });
            break;
          }
        } catch {
          // Continuer avec le cookie suivant
          continue;
        }
      }
    }
  } catch {
    // En cas d'erreur, retourner le client sans session
  }

  return supabase;
}