/**
 * Gestion de la déconnexion cross-domain
 */
'use client';

import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';
import { crossDomainSessionSync } from './cross-domain-session-sync';

export class CrossDomainLogout {
  private static instance: CrossDomainLogout;
  private isLoggingOut = false;

  static getInstance(): CrossDomainLogout {
    if (!CrossDomainLogout.instance) {
      CrossDomainLogout.instance = new CrossDomainLogout();
    }
    return CrossDomainLogout.instance;
  }

  /**
   * Déconnexion complète cross-domain
   */
  async signOut(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Empêcher les déconnexions multiples simultanées
    if (this.isLoggingOut) {
      return;
    }
    
    this.isLoggingOut = true;

    try {
      const supabase = supabaseBrowserWithCookies();
      
      // 1. Déconnexion Supabase (sans scope global pour éviter 403)
      try {
        await supabase.auth.signOut({ scope: 'local' });
        } catch {
        // Si la déconnexion Supabase échoue, continuer quand même
      }
      
      // 2. Nettoyer la session cross-domain
      await crossDomainSessionSync.clearSessionFromAllDomains();
      
      // 3. Nettoyer localStorage et sessionStorage
      this.clearAllStorage();
      
      // 4. Nettoyer les cookies
      this.clearAllCookies();
      
      // 5. Attendre un peu pour s'assurer que tout est nettoyé
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 6. Rediriger vers le domaine principal
      this.redirectToMainDomain();
      
      } catch {
      // En cas d'erreur, forcer la redirection
      this.clearAllStorage();
      this.clearAllCookies();
      await new Promise(resolve => setTimeout(resolve, 200));
      this.redirectToMainDomain();
    } finally {
      this.isLoggingOut = false;
    }
  }

  /**
   * Nettoie tout le stockage local
   */
  private clearAllStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // Nettoyer localStorage - plus agressif
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || 
            key.includes('session') || 
            key.includes('sb-') || 
            key.includes('cross-domain') ||
            key.includes('auth') ||
            key.includes('user') ||
            key.includes('token')) {
          localStorage.removeItem(key);
        }
      });
      
      // Nettoyer sessionStorage - plus agressif
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || 
            key.includes('session') || 
            key.includes('sb-') || 
            key.includes('cross-domain') ||
            key.includes('auth') ||
            key.includes('user') ||
            key.includes('token')) {
          sessionStorage.removeItem(key);
        }
      });

      // Nettoyer aussi les clés spécifiques de Supabase
      const supabaseKeys = [
        'supabase.auth.token',
        'supabase.auth.user',
        'sb-ndlmzwwfwugtwpmebdog-auth-token',
        'cross-domain-session'
      ];
      
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      } catch {
      // Erreur silencieuse
    }
  }

  /**
   * Nettoie tous les cookies
   */
  private clearAllCookies(): void {
    if (typeof window === 'undefined') return;

    try {
      const hostname = window.location.hostname;
      
      // Liste des cookies à nettoyer
      const cookiesToClear = [
        'sb-ndlmzwwfwugtwpmebdog-auth-token',
        'sb-ndlmzwwfwugtwpmebdog-auth-token.0',
        'sb-ndlmzwwfwugtwpmebdog-auth-token.1',
        'supabase-auth-token',
        'sb-auth-token',
        'cross-domain-session'
      ];

      // Nettoyer TOUS les cookies existants
      document.cookie.split(";").forEach(function(c) { 
        const cookieName = c.split("=")[0].trim();
        // Nettoyer tous les cookies qui contiennent des mots-clés liés à l'auth
        if (cookieName.includes('sb-') || 
            cookieName.includes('supabase') || 
            cookieName.includes('auth') || 
            cookieName.includes('session') ||
            cookieName.includes('cross-domain')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${hostname}`;
        }
      });

      // Nettoyer les cookies spécifiques
      cookiesToClear.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${hostname}`;
      });

      // En production, nettoyer aussi pour le domaine racine
      if (!hostname.includes('localhost')) {
        const rootDomain = this.getRootDomain();
        cookiesToClear.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${rootDomain}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${rootDomain}`;
        });
      }
      } catch {
      // Erreur silencieuse
    }
  }

  /**
   * Redirige vers le domaine principal
   */
  private redirectToMainDomain(): void {
    if (typeof window === 'undefined') return;

    try {
      const hostname = window.location.hostname;
      
      // Déterminer le domaine principal
      let mainDomain: string;
      
      if (hostname.includes('localhost')) {
        // En développement
        mainDomain = 'http://localhost:3000';
      } else {
        // En production
        mainDomain = 'https://qgchatting.com';
      }
      
      // Vérifier si on est déjà sur le domaine principal
      const isOnMainDomain = hostname === 'localhost' || 
                            hostname === 'qgchatting.com' || 
                            hostname === 'www.qgchatting.com';
      
      if (isOnMainDomain) {
        // Si on est déjà sur le domaine principal, forcer un rechargement complet
        window.location.replace(`${mainDomain}/home?logout=true&t=${Date.now()}&force_reload=true`);
      } else {
        // Si on est sur un sous-domaine, rediriger vers le domaine principal avec rechargement forcé
        window.location.replace(`${mainDomain}/home?logout=true&t=${Date.now()}&force_reload=true`);
      }
      } catch {
      // En cas d'erreur, rediriger vers la page de connexion
      window.location.replace('/auth/sign-in');
    }
  }

  /**
   * Obtient le domaine racine
   */
  private getRootDomain(): string {
    if (typeof window === 'undefined') return 'qgchatting.com';
    
    const hostname = window.location.hostname;
    
    // En développement
    if (hostname.includes('localhost')) {
      return 'localhost:3000';
    }
    
    // En production, extraire le domaine racine
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    
    return hostname;
  }
}

// Instance globale
export const crossDomainLogout = CrossDomainLogout.getInstance();
