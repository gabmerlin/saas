// lib/invitations/actions.ts
'use client';

import { createClient } from '@/lib/supabase/client';
import { AUTH_CONFIG } from '@/lib/auth/config';

const supabase = createClient();

export interface InvitationData {
  email: string;
  role: string;
  tenantId: string;
}

export async function createInvitation(data: InvitationData) {
  const { data: result, error } = await supabase
    .from('invitations')
    .insert({
      tenant_id: data.tenantId,
      email: data.email,
      role_key: data.role,
      invited_by: (await supabase.auth.getUser()).data.user?.id,
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + AUTH_CONFIG.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return result;
}

export async function getInvitations(tenantId: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      roles!inner(key, description),
      profiles!invitations_invited_by_fkey(full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function acceptInvitation(token: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      *,
      tenants!inner(id, name, subdomain)
    `)
    .eq('token', token)
    .eq('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    throw new Error('Invitation invalide ou expirée');
  }

  // Ajouter l'utilisateur au tenant
  const { error: userTenantError } = await supabase
    .from('user_tenants')
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      tenant_id: data.tenant_id,
      is_owner: false,
    });

  if (userTenantError) {
    throw new Error('Erreur lors de l\'ajout au tenant');
  }

  // Ajouter le rôle
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('key', data.role_key)
    .single();

  if (roleData) {
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        tenant_id: data.tenant_id,
        role_id: roleData.id,
      });

    if (roleError) {
      console.warn('Erreur lors de l\'ajout du rôle:', roleError);
    }
  }

  // Marquer l'invitation comme acceptée
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', data.id);

  if (updateError) {
    console.warn('Erreur lors de la mise à jour de l\'invitation:', updateError);
  }

  return data;
}

export async function revokeInvitation(invitationId: string) {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resendInvitation(invitationId: string) {
  const { data, error } = await supabase
    .from('invitations')
    .update({
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + AUTH_CONFIG.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}