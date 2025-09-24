import { NextResponse } from 'next/server';
import { createClient, createClientWithSession } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/tenants';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    // Récupération de l'utilisateur authentifié
    const authHeader = req.headers.get('authorization');
    const sessionToken = req.headers.get('x-session-token');
    
    let user: { id: string; email?: string } | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient();
      const { data: { user: tokenUser }, error: userErr } = await supabase.auth.getUser(token);
      
      if (!userErr && tokenUser) {
        user = tokenUser;
      }
    } else if (sessionToken) {
      const supabase = createClient();
      const { data: { user: sessionUser }, error: userErr } = await supabase.auth.getUser(sessionToken);
      
      if (!userErr && sessionUser) {
        user = sessionUser;
      }
    } else {
      // Fallback vers createClientWithSession
      const supabase = await createClientWithSession();
      const { data: { user: cookieUser }, error: userErr } = await supabase.auth.getUser();
      
      if (!userErr && cookieUser) {
        user = cookieUser;
      }
    }
    
    if (!user) {
      return NextResponse.json({ 
        ok: false, 
        error: "UNAUTHENTICATED", 
        detail: "No valid authentication found" 
      }, { status: 401 });
    }

    // Vérifier si l'utilisateur a déjà une agence
    const dbClient = getServiceClient();
    
    const { data: existingAgency, error } = await dbClient
      .from('user_tenants')
      .select(`
        tenant_id,
        is_owner,
        tenants!user_tenants_tenant_id_fkey(
          id,
          name,
          subdomain,
          locale
        )
      `)
      .eq('user_id', user.id)
      .eq('is_owner', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json({ 
        ok: false, 
        error: "DATABASE_ERROR", 
        detail: error.message 
      }, { status: 500 });
    }

    
    if (existingAgency && existingAgency.tenants) {
      // tenants peut être un objet (jointure simple) ou un tableau (jointure multiple)
      const tenant = Array.isArray(existingAgency.tenants) 
        ? existingAgency.tenants[0] 
        : existingAgency.tenants;
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.PRIMARY_ZONE;
      const agencyUrl = rootDomain ? `https://${tenant.subdomain}.${rootDomain}` : null;
      
      
      return NextResponse.json({
        ok: true,
        hasExistingAgency: true,
        agency: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          locale: tenant.locale,
          url: agencyUrl
        }
      });
    }

    return NextResponse.json({
      ok: true,
      hasExistingAgency: false
    });

  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: "INTERNAL_ERROR",
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
