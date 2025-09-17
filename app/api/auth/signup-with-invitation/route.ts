// app/api/auth/signup-with-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username, invitationToken } = body;

    if (!email || !password || !username || !invitationToken) {
      return NextResponse.json(
        { error: 'Email, mot de passe, nom d\'utilisateur et token d\'invitation requis' },
        { status: 400 }
      );
    }

    // Utiliser le service client pour les opérations admin
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient: createServiceClient } = require('@supabase/supabase-js');
    const supabase = createServiceClient(url, key, { auth: { persistSession: false } });

    // Vérifier que l'invitation existe et est valide
    const { data: invitation, error: invitationError } = await supabase
      .from('invitation')
      .select('*')
      .eq('token', invitationToken)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation invalide ou expirée' },
        { status: 400 }
      );
    }

    // Créer le compte utilisateur avec email confirmé
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true, // Confirmer automatiquement l'email
    });

    if (signUpError) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Utilisateur non créé' },
        { status: 500 }
      );
    }

    // Accepter l'invitation
    try {
      // Ajouter l'utilisateur au tenant
      const { error: userTenantError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: authData.user.id,
          tenant_id: invitation.tenant_id,
          is_owner: false,
        });

      if (userTenantError) {
        // Ne pas faire échouer la création du compte
      }

      // Ajouter le rôle
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('key', invitation.role_key)
        .single();

      if (roleData) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            tenant_id: invitation.tenant_id,
            role_id: roleData.id,
          });

        if (roleError) {
          // Ignorer l'erreur de rôle
        }
      }

      // Marquer l'invitation comme acceptée
      const { error: updateError } = await supabase
        .from('invitation')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) {
        // Ignorer l'erreur de mise à jour de l'invitation
      }

      // Récupérer les détails du tenant pour la redirection
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name, subdomain')
        .eq('id', invitation.tenant_id)
        .single();

      return NextResponse.json({
        success: true,
        user: authData.user,
        tenant: tenantData,
        message: 'Compte créé et invitation acceptée avec succès'
      });

    } catch (invitationError) {
      return NextResponse.json(
        { error: 'Compte créé mais erreur lors de l\'acceptation de l\'invitation' },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
