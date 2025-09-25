// lib/invitations/actions.js - Version JavaScript pour éviter les problèmes TypeScript
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';
import { AUTH_CONFIG } from '@/lib/auth/config';

const supabase = supabaseBrowser;

export async function createInvitation(data) {
  const { data: invitation, error } = await supabase()
    .from('invitation')
    .insert({
      tenant_id: data.tenantId,
      email: data.email,
      role: data.role,
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + AUTH_CONFIG.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
      invited_by: data.invitedBy,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return invitation;
}

export async function getInvitationByToken(token) {
  const { data: invitation, error } = await supabase()
    .from('invitation')
    .select(`
      *,
      tenants(name, subdomain)
    `)
    .eq('token', token)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return invitation;
}

export async function acceptInvitation(token, userData) {
  // Récupérer l'invitation
  const invitationData = await getInvitationByToken(token);

  if (!invitationData) {
    throw new Error('Invitation non trouvée');
  }

  if (new Date(invitationData.expires_at) < new Date()) {
    throw new Error('Invitation expirée');
  }

  if (invitationData.accepted_at) {
    throw new Error('Invitation déjà acceptée');
  }

  // Créer l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabase().auth.signUp({
    email: invitationData.email,
    password: userData.password,
    options: {
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
      }
    }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Erreur lors de la création de l\'utilisateur');
  }

  // Attendre que l'utilisateur soit créé
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Ajouter l'utilisateur au tenant
  const { error: tenantError } = await supabase()
    .from('user_tenants')
    .insert({
      user_id: authData.user.id,
      tenant_id: invitationData.tenant_id,
      role: invitationData.role,
    });

  if (tenantError) {
    // Ignorer l'erreur de tenant
  }

  // Ajouter le rôle utilisateur
  const { error: roleError } = await supabase()
    .from('user_roles')
    .insert({
      user_id: authData.user.id,
      role: invitationData.role,
      tenant_id: invitationData.tenant_id,
    });

  if (roleError) {
    // Ignorer l'erreur de rôle
  }

  // Marquer l'invitation comme acceptée
  try {
    await supabase()
      .from('invitation')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitationData.id);
    } catch {
    // Ignorer l'erreur de mise à jour de l'invitation
  }

  return invitationData;
}

export async function revokeInvitation(invitationId) {
  const { data, error } = await supabase()
    .from('invitation')
    .delete()
    .eq('id', invitationId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getInvitations(tenantId) {
  const { data: invitations, error } = await supabase()
    .from('invitation')
    .select(`
      *,
      tenants(name, subdomain)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return invitations;
}

export async function resendInvitation(invitationId) {
  try {
    const { data, error } = await supabase()
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
    } catch {
    throw new Error('Erreur lors du renvoi de l\'invitation');
  }
}
