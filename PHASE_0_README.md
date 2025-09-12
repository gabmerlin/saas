# PHASE 0 - FINALISATION AUTHENTIFICATION & BASE DE DONNÉES

## 🎯 OBJECTIFS DE LA PHASE 0

Cette phase finalise l'authentification et la base de données pour avoir une base solide avant d'attaquer les fonctionnalités métier complexes.

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### 1. Authentification Avancée
- ✅ **Google OAuth** - Connexion avec Google
- ✅ **Vérification email obligatoire** - Contrôle strict des emails
- ✅ **2FA optionnelle** - Authentification à deux facteurs
- ✅ **Gestion des sessions** - 6h par défaut, Remember me 30 jours
- ✅ **Rate limiting** - Protection contre les attaques par force brute
- ✅ **Réinitialisation de mot de passe** - Via email sécurisé

### 2. Système d'Invitations
- ✅ **Invitations par email** - Avec tokens sécurisés
- ✅ **Système de rôles** - Owner, Admin, Manager, Employee, Marketing
- ✅ **Emails brandés** - Templates personnalisables par tenant
- ✅ **Gestion des invitations** - Création, révocation, renvoi
- ✅ **Acceptation d'invitations** - Interface dédiée

### 3. Base de Données Complète
- ✅ **Tables d'authentification** - Sessions, tentatives, 2FA
- ✅ **Tables d'invitations** - Invitations et referrals
- ✅ **Tables employés** - Fiches complètes avec statuts
- ✅ **Tables métier** - Modèles, shifts, boxes, planning
- ✅ **RLS complet** - Sécurité au niveau des lignes
- ✅ **Fonctions utilitaires** - Nettoyage automatique, vérifications

### 4. Interface Utilisateur
- ✅ **Formulaires améliorés** - Design moderne avec shadcn/ui
- ✅ **Gestion des invitations** - Interface d'administration
- ✅ **Pages de vérification** - Email et mot de passe
- ✅ **Notifications** - Toast et alertes
- ✅ **Responsive design** - Mobile-first

## 🗄️ STRUCTURE DE BASE DE DONNÉES

### Tables d'Authentification
```sql
- invitations (invitations par email)
- referrals (système de parrainage)
- user_sessions (gestion des sessions)
- login_attempts (rate limiting)
- totp_secrets (2FA)
```

### Tables Métier
```sql
- employee_profiles (fiches employés)
- model_profiles (modèles de chatteurs)
- shift_templates (templates de shifts)
- shift_instances (instances de shifts)
- boxes (attribution des boxes)
- schedule_submissions (soumissions de planning)
- attendance (présence et retards)
```

## 🔧 CONFIGURATION REQUISE

### 1. Variables d'Environnement
Copiez `.env.example` vers `.env.local` et configurez :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=qgchatting.com

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@qgchatting.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. Configuration Supabase

#### A. Activer Google OAuth
1. Aller dans **Authentication > Providers**
2. Activer **Google**
3. Configurer les credentials Google OAuth
4. Ajouter les URLs de redirection :
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

#### B. Configurer les emails
1. Aller dans **Authentication > Email Templates**
2. Personnaliser les templates d'invitation et de réinitialisation
3. Configurer les paramètres SMTP

#### C. Appliquer les migrations SQL
1. Aller dans **SQL Editor**
2. Exécuter les migrations dans l'ordre :
   - `0006_auth_enhancements.sql`
   - `0007_employee_profiles.sql`

### 3. Configuration Google OAuth

#### A. Créer un projet Google Cloud
1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un nouveau projet
3. Activer l'API Google+ et Google Identity

#### B. Configurer OAuth 2.0
1. Aller dans **APIs & Services > Credentials**
2. Créer des identifiants OAuth 2.0
3. Configurer les URLs autorisées :
   - `http://localhost:3000`
   - `https://your-domain.com`

## 🚀 DÉMARRAGE

### 1. Installation des dépendances
```bash
# Windows 11
pnpm install

# Ou avec npm
npm install
```

### 2. Configuration de l'environnement
```bash
# Copier le fichier d'exemple
copy .env.example .env.local

# Éditer avec VS Code
code .env.local
```

### 3. Lancement en développement
```bash
# Démarrer le serveur de développement
pnpm dev

# Ou avec npm
npm run dev
```

### 4. Accès à l'application
- **URL locale** : http://localhost:3000
- **Connexion** : http://localhost:3000/auth/sign-in
- **Inscription** : http://localhost:3000/auth/sign-up

## 🧪 TESTS

### 1. Test d'authentification
1. Aller sur `/auth/sign-up`
2. Créer un compte avec email valide
3. Vérifier la réception de l'email de vérification
4. Cliquer sur le lien de vérification
5. Se connecter avec `/auth/sign-in`

### 2. Test Google OAuth
1. Aller sur `/auth/sign-in`
2. Cliquer sur "Se connecter avec Google"
3. Autoriser l'application
4. Vérifier la redirection vers le dashboard

### 3. Test des invitations
1. Se connecter en tant qu'owner/admin
2. Aller dans la section invitations
3. Créer une invitation pour un email
4. Vérifier la réception de l'email d'invitation
5. Accepter l'invitation depuis l'email

## 📁 FICHIERS CRÉÉS/MODIFIÉS

### Nouveaux fichiers
```
lib/auth/
├── config.ts
├── session.ts
├── actions.ts
└── middleware.ts

lib/invitations/
├── actions.ts
└── email-templates.ts

components/invitations/
└── invitation-manager.tsx

app/auth/
├── verify-email/page.tsx
└── reset-password/page.tsx

app/invitations/
└── accept/page.tsx

app/api/invitations/
├── route.ts
├── accept/route.ts
└── check/route.ts

sql/migrations/
├── 0006_auth_enhancements.sql
└── 0007_employee_profiles.sql
```

### Fichiers modifiés
```
app/(auth)/sign-in/SignInForm.tsx
middleware.ts
.env.example
```

## 🔒 SÉCURITÉ

### 1. RLS (Row Level Security)
- Toutes les tables ont des politiques RLS
- Isolation complète par tenant
- Permissions granulaires par rôle

### 2. Rate Limiting
- Maximum 5 tentatives de connexion par 15 minutes
- Lockout automatique en cas d'échec
- Nettoyage automatique des tentatives anciennes

### 3. Validation des mots de passe
- Minimum 8 caractères
- Majuscules, chiffres, caractères spéciaux requis
- Validation côté client et serveur

### 4. Tokens sécurisés
- Tokens d'invitation avec expiration
- Tokens de réinitialisation avec expiration
- Génération cryptographique sécurisée

## 🐛 DÉPANNAGE

### Problèmes courants

#### 1. Erreur de connexion Supabase
```bash
# Vérifier les variables d'environnement
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 2. Emails non reçus
- Vérifier la configuration SMTP
- Vérifier le dossier spam
- Tester avec un autre fournisseur email

#### 3. Google OAuth ne fonctionne pas
- Vérifier les URLs autorisées dans Google Cloud
- Vérifier les credentials OAuth
- Vérifier la configuration Supabase

#### 4. Erreurs de base de données
- Vérifier que les migrations sont appliquées
- Vérifier les permissions RLS
- Vérifier les clés étrangères

## 📋 PROCHAINES ÉTAPES

Une fois la Phase 0 terminée, nous passerons à :

### Phase 1 - Billing BTCPay
- Intégration BTCPay Server
- Gestion des plans tarifaires
- Système de facturation
- Gestion des paiements

### Phase 2 - Fonctionnalités Métier
- Système de paie complet
- Gestion des shifts et planning
- Attribution des boxes
- Système de présence

### Phase 3 - Instagram Marketing
- Intégration Instagram API
- Métriques et analytics
- Webhooks Instagram
- Corrélation KPIs

## 📞 SUPPORT

En cas de problème :
1. Vérifier les logs de la console
2. Vérifier les logs Supabase
3. Vérifier la configuration des variables d'environnement
4. Consulter la documentation Supabase

---

**Phase 0 terminée !** 🎉
L'authentification et la base de données sont maintenant complètes et sécurisées.