// lib/auth/session.ts
import { createClient } from '@/lib/supabase/server';
import { AUTH_CONFIG } from './config';
import { cookies } from 'next/headers';

export interface SessionData {
  user: {
    id: string;
    email: string;
    email_verified: boolean;
    full_name?: string;
    avatar_url?: string;
  };
  tenant?: {
    id: string;
    subdomain: string;
    name: string;
    locale: string;
  };
  roles: string[];
  permissions: string[];
  expires_at: number;
}

export async function getServerSession(): Promise<SessionData | null> {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Vérifier si l'email est vérifié
    if (AUTH_CONFIG.EMAIL_VERIFICATION_REQUIRED && !user.email_confirmed_at) {
      return null;
    }

    // Récupérer les données du tenant depuis le header
    const cookieStore = cookies();
    const tenantSubdomain = cookieStore.get('x-tenant-subdomain')?.value;
    
    let tenant = null;
    if (tenantSubdomain) {
      const { data: tenantData } = await supabase
        .rpc('tenant_id_by_subdomain', { p_subdomain: tenantSubdomain });
      
      if (tenantData && tenantData.length > 0) {
        tenant = tenantData[0];
      }
    }

    // Récupérer les rôles et permissions
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles!inner(key),
        role_permissions!inner(
          permissions!inner(code)
        )
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', tenant?.id);

    const roles = userRoles?.map(ur => ur.roles.key) || [];
    const permissions = userRoles?.flatMap(ur => 
      ur.role_permissions?.map((rp: any) => rp.permissions.code) || []
    ) || [];

    return {
      user: {
        id: user.id,
        email: user.email!,
        email_verified: !!user.email_confirmed_at,
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
      },
      tenant,
      roles,
      permissions,
      expires_at: Date.now() + (AUTH_CONFIG.SESSION_DURATION * 1000),
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireRole(role: string): Promise<SessionData> {
  const session = await requireAuth();
  if (!session.roles.includes(role)) {
    throw new Error(`Role '${role}' required`);
  }
  return session;
}

export async function requirePermission(permission: string): Promise<SessionData> {
  const session = await requireAuth();
  if (!session.permissions.includes(permission)) {
    throw new Error(`Permission '${permission}' required`);
  }
  return session;
}