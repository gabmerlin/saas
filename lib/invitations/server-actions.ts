// lib/invitations/server-actions.ts
import { createClient } from '@/lib/supabase/server';
import { AUTH_CONFIG } from '@/lib/auth/config';

export interface InvitationData {
  email: string;
  role: string;
  tenantId: string;
}

export async function createInvitationServer(data: InvitationData, userId: string) {
  const supabase = createClient();
  
  const { data: result, error } = await supabase
    .from('invitation')
    .insert({
      tenant_id: data.tenantId,
      email: data.email,
      role_key: data.role,
      invited_by: userId,
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

export async function getInvitationsServer(tenantId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('invitation')
    .select(`
      *,
      roles!inner(key, description),
      profiles!invitation_invited_by_fkey(full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function acceptInvitationServer(token: string, userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('invitation')
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
      user_id: userId,
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
        user_id: userId,
        tenant_id: data.tenant_id,
        role_id: roleData.id,
      });

    if (roleError) {
      console.warn('Erreur lors de l\'ajout du rôle:', roleError);
    }
  }

  // Marquer l'invitation comme acceptée
  const { error: updateError } = await supabase
    .from('invitation')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', data.id);

  if (updateError) {
    console.warn('Erreur lors de la mise à jour de l\'invitation:', updateError);
  }

  return data;
}

export async function revokeInvitationServer(invitationId: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('invitation')
    .delete()
    .eq('id', invitationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resendInvitationServer(invitationId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('invitation')
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
