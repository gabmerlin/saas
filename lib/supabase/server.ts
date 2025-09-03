import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

type Opts = { serviceRole?: boolean };

export function createClient(opts?: Opts): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = opts?.serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'qgchatting-saas' } }
  });
}
