// lib/invitations/email-templates.ts
import { AUTH_CONFIG } from '@/lib/auth/config';

export interface InvitationEmailData {
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
}

export function generateInvitationEmail(data: InvitationEmailData): string {
  const { tenantName, tenantSubdomain, inviterName, roleName, invitationUrl, expiresAt, tenantColors } = data;
  
  const primaryColor = tenantColors?.primary || '#000000';
  const secondaryColor = tenantColors?.secondary || '#666666';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation à rejoindre ${tenantName}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: ${primaryColor};
            margin-bottom: 10px;
        }
        .tenant-name {
            font-size: 20px;
            color: ${secondaryColor};
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .cta-button {
            display: inline-block;
            background-color: ${primaryColor};
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .cta-button:hover {
            opacity: 0.9;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .expires {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">QG Chatting</div>
            <div class="tenant-name">${tenantName}</div>
        </div>
        
        <div class="content">
            <h2>Vous êtes invité(e) à rejoindre ${tenantName} !</h2>
            
            <p>Bonjour,</p>
            
            <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe de <strong>${tenantName}</strong> en tant que <strong>${roleName}</strong>.</p>
            
            <p>QG Chatting est une plateforme de gestion d'agences de chatteurs avec des fonctionnalités avancées de planning, de paie et de marketing Instagram.</p>
            
            <div style="text-align: center;">
                <a href="${invitationUrl}" class="cta-button">
                    Accepter l'invitation
                </a>
            </div>
            
            <div class="expires">
                ⏰ Cette invitation expire le ${expiresAt.toLocaleDateString('fr-FR')} à ${expiresAt.toLocaleTimeString('fr-FR')}
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: ${primaryColor}; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">
                ${invitationUrl}
            </p>
        </div>
        
        <div class="footer">
            <p>Cette invitation a été envoyée par ${inviterName} via QG Chatting.</p>
            <p>Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
            <p>© 2024 QG Chatting. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

export function generatePasswordResetEmail(email: string, resetUrl: string, tenantName?: string): string {
  const primaryColor = '#000000';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réinitialisation de mot de passe</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: ${primaryColor};
            margin-bottom: 10px;
        }
        .cta-button {
            display: inline-block;
            background-color: ${primaryColor};
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">QG Chatting</div>
            ${tenantName ? `<div style="color: #666; font-size: 18px;">${tenantName}</div>` : ''}
        </div>
        
        <div class="content">
            <h2>Réinitialisation de votre mot de passe</h2>
            
            <p>Bonjour,</p>
            
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour le compte <strong>${email}</strong>.</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="cta-button">
                    Réinitialiser mon mot de passe
                </a>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: ${primaryColor}; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">
                ${resetUrl}
            </p>
            
            <p><strong>Important :</strong> Ce lien expire dans 1 heure pour des raisons de sécurité.</p>
        </div>
        
        <div class="footer">
            <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
            <p>© 2024 QG Chatting. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}