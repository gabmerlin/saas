// lib/invitations/email-templates.ts

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
  const { tenantName, inviterName, roleName, invitationUrl, expiresAt, tenantColors } = data;
  
  const primaryColor = tenantColors?.primary || '#3b82f6';
  const secondaryColor = tenantColors?.secondary || '#6b7280';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation à rejoindre ${tenantName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .header {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tagline {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 24px;
            line-height: 1.7;
        }
        .role-badge {
            display: inline-block;
            background: ${primaryColor};
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .cta-container {
            text-align: center;
            margin: 32px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            color: white;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
        }
        .expires {
            background: linear-gradient(120deg, #fef2f2 0%, #fee2e2 100%);
            border: 1px solid #fca5a5;
            border-radius: 12px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: center;
        }
        .expires-icon {
            font-size: 20px;
            margin-right: 8px;
        }
        .expires-text {
            font-size: 14px;
            color: #dc2626;
            font-weight: 600;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        .footer-link {
            color: ${primaryColor};
            text-decoration: none;
        }
        .backup-link {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            word-break: break-all;
            font-size: 14px;
            color: #6b7280;
            font-family: monospace;
        }
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 12px;
            }
            .header, .content, .footer {
                padding: 24px 20px;
            }
            .greeting {
                font-size: 20px;
            }
            .cta-button {
                padding: 14px 28px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">QG Chatting</div>
            <div class="tagline">Plateforme de gestion d'agences</div>
        </div>
        
        <div class="content">
            <h1 class="greeting">🎉 Vous êtes invité(e) !</h1>
            
            <div class="message">
                <p>Bonjour,</p>
                
                <p><strong>${inviterName}</strong> vous invite à rejoindre l'équipe de <strong>${tenantName}</strong> en tant que <span class="role-badge">${roleName}</span>.</p>
                
                <p>Rejoignez une plateforme professionnelle de gestion d'agences avec des outils modernes pour optimiser votre travail d'équipe.</p>
            </div>
            
            <div class="cta-container">
                <a href="${invitationUrl}" class="cta-button">
                    Accepter l'invitation
                </a>
            </div>
            
            <div class="expires">
                <span class="expires-icon">⏰</span>
                <span class="expires-text">Cette invitation expire le ${expiresAt.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} à ${expiresAt.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</span>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            </p>
            <div class="backup-link">${invitationUrl}</div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                Cet email a été envoyé automatiquement par <a href="https://qgchatting.com" class="footer-link">QG Chatting</a>
            </p>
            <p class="footer-text">
                Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email en toute sécurité.
            </p>
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
