// app/api/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
import { requireAuth } from '@/lib/auth/server/session';
import { createInvitationServer, getInvitationsServer } from '@/lib/invitations/server-actions';
import { generateInvitationEmail } from '@/lib/invitations/email-templates';
import nodemailer from 'nodemailer';

// GET /api/invitations - Récupérer les invitations
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur appartient au tenant
    if (session.tenant?.id !== tenantId) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const invitations = await getInvitationsServer(tenantId);
    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des invitations' },
      { status: 500 }
    );
  }
}

// POST /api/invitations - Créer une invitation
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { email, role, tenant_id } = body;

    if (!email || !role || !tenant_id) {
      return NextResponse.json(
        { error: 'email, role et tenant_id requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur appartient au tenant et a les permissions
    if (session.tenant?.id !== tenant_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!session.roles.includes('owner') && !session.roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    // Créer l'invitation
    const invitation = await createInvitationServer({
      email,
      role,
      tenantId: tenant_id,
    }, session.user.id);

    // Envoyer l'email d'invitation
    try {
      // Récupérer le prénom de l'utilisateur
      const inviterName = session.user.full_name?.split(' ')[0] || 
                         session.user.email?.split('@')[0]?.replace(/[._-]/g, ' ')?.split(' ')[0] || 
                         'Un administrateur';

      await sendInvitationEmail({
        email,
        tenantName: session.tenant?.name || 'Votre agence',
        tenantSubdomain: session.tenant?.subdomain || '',
        inviterName: inviterName,
        roleName: role,
        invitationUrl: `${process.env.APP_BASE_URL}/invitations/accept?token=${invitation.token}`,
        expiresAt: new Date(invitation.expires_at),
        tenantColors: {
          primary: '#000000',
          secondary: '#666666',
        },
      });
      } catch {
      // Ne pas faire échouer la création de l'invitation si l'email échoue
    }

    return NextResponse.json({ invitation });
  } catch {
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'invitation' },
      { status: 500 }
    );
  }
}
// Fonction pour envoyer l'email d'invitation
async function sendInvitationEmail(data: {
  email: string;
  tenantName: string;
  tenantSubdomain: string;
  inviterName: string;
  roleName: string;
  invitationUrl: string;
  expiresAt: Date;
  tenantColors?: {
    primary: string;
    secondary: string;
  };
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Ignorer les erreurs de certificat auto-signé
    },
  });

  const html = generateInvitationEmail(data);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@qgchatting.com',
    to: data.email,
    subject: `Invitation à rejoindre ${data.tenantName} sur QG Chatting`,
    html,
  });
}
