// lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from './supabase-server-client';
import { AUTH_CONFIG } from '../config';

export async function requireAuth(request: NextRequest) {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Vérifier si l'email est vérifié
    if (AUTH_CONFIG.EMAIL_VERIFICATION_REQUIRED && !user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/auth/verify-email', request.url));
    }

    return null; // Pas d'erreur, continuer
  } catch {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }
}

export async function requireRole(request: NextRequest, role: string) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Récupérer le tenant depuis le header
    const tenantSubdomain = request.headers.get('x-tenant-subdomain');
    if (!tenantSubdomain) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Récupérer les rôles de l'utilisateur
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles!inner(key)
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', (await supabase.rpc('tenant_id_by_subdomain', { p_subdomain: tenantSubdomain })).data?.[0]?.id);

    const roles = userRoles?.map(ur => ur.roles[0]?.key).filter(Boolean) || [];
    
    if (!roles.includes(role)) {
      return NextResponse.json(
        { error: `Rôle '${role}' requis` },
        { status: 403 }
      );
    }

    return null; // Pas d'erreur, continuer
  } catch {
    return NextResponse.json(
      { error: 'Erreur de vérification des rôles' },
      { status: 500 }
    );
  }
}

export async function requirePermission(request: NextRequest, permission: string) {
  const authResponse = await requireAuth(request);
  if (authResponse) return authResponse;

  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Récupérer le tenant depuis le header
    const tenantSubdomain = request.headers.get('x-tenant-subdomain');
    if (!tenantSubdomain) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Récupérer les permissions de l'utilisateur
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_permissions!inner(
          permissions!inner(code)
        )
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', (await supabase.rpc('tenant_id_by_subdomain', { p_subdomain: tenantSubdomain })).data?.[0]?.id);

    const permissions = userRoles?.flatMap(ur => 
      ur.role_permissions?.map((rp: { permissions: { code: string }[] }) => rp.permissions.map(p => p.code)).flat() || []
    ) || [];
    
    if (!permissions.includes(permission)) {
      return NextResponse.json(
        { error: `Permission '${permission}' requise` },
        { status: 403 }
      );
    }

    return null; // Pas d'erreur, continuer
  } catch {
    return NextResponse.json(
      { error: 'Erreur de vérification des permissions' },
      { status: 500 }
    );
  }
}

export function createRouteHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean;
    requireRole?: string;
    requirePermission?: string;
  }
) {
  return async (request: NextRequest) => {
    // Vérifier l'authentification
    if (options?.requireAuth) {
      const authResponse = await requireAuth(request);
      if (authResponse) return authResponse;
    }

    // Vérifier le rôle
    if (options?.requireRole) {
      const roleResponse = await requireRole(request, options.requireRole);
      if (roleResponse) return roleResponse;
    }

    // Vérifier la permission
    if (options?.requirePermission) {
      const permissionResponse = await requirePermission(request, options.requirePermission);
      if (permissionResponse) return permissionResponse;
    }

    // Exécuter le handler
    return handler(request);
  };
}