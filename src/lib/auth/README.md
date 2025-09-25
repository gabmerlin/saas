# 🔐 AUTHENTICATION CENTRALISÉE

## 📁 Structure du dossier `lib/auth/`

```
lib/auth/
├── README.md                    # Documentation
├── index.ts                     # Point d'entrée principal
├── config.ts                    # Configuration d'authentification
├── types.ts                     # Types TypeScript
├── 
├── # === CLIENT-SIDE ===
├── client/
│   ├── supabase-client.ts      # Client Supabase pour le navigateur
│   ├── session-manager.ts      # Gestion des sessions
│   ├── cross-domain-sync.ts    # Synchronisation cross-domain
│   └── auth-actions.ts          # Actions d'authentification (login, logout, etc.)
├── 
├── # === SERVER-SIDE ===
├── server/
│   ├── supabase-server.ts      # Client Supabase pour le serveur
│   ├── session-handler.ts      # Gestion des sessions côté serveur
│   └── route-guards.ts         # Protection des routes API
├── 
├── # === COMPONENTS ===
├── components/
│   ├── session-provider.tsx    # Provider de session
│   ├── auth-guard.tsx          # Protection des composants
│   └── owner-guard.tsx         # Protection pour les propriétaires
├── 
├── # === HOOKS ===
├── hooks/
│   ├── use-auth.ts             # Hook principal d'authentification
│   ├── use-session.ts          # Hook de session
│   └── use-permissions.ts     # Hook de permissions
├── 
├── # === UTILITIES ===
├── utils/
│   ├── cookies.ts              # Gestion des cookies
│   ├── redirects.ts            # Gestion des redirections
│   └── validation.ts           # Validation des données
└── 
└── # === LEGACY (à nettoyer) ===
├── legacy/
    ├── old-session-sync.ts     # Ancien système (à supprimer)
    └── old-cross-domain.ts     # Ancien système (à supprimer)
```

## 🎯 Objectifs

1. **CENTRALISATION** : Tout l'auth dans un seul dossier
2. **ORGANISATION** : Structure claire et logique
3. **MAINTENABILITÉ** : Code facile à comprendre et modifier
4. **PERFORMANCE** : Pas de doublons ou de conflits
5. **DOCUMENTATION** : Chaque fichier a un rôle précis

## 🚀 Utilisation

```typescript
// Import centralisé
import { useAuth, SessionProvider } from '@/lib/auth';

// Utilisation simple
const { user, isAuthenticated, signOut } = useAuth();
```
