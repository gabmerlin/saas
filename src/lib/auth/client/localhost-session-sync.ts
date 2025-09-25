/**
 * Synchronisation de session spécifique pour localhost
 * Utilise une approche de redirection avec paramètres URL
 */
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export class LocalhostSessionSync {
  private static instance: LocalhostSessionSync;
  private isInitialized = false;

  static getInstance(): LocalhostSessionSync {
    if (!LocalhostSessionSync.instance) {
      LocalhostSessionSync.instance = new LocalhostSessionSync();
    }
    return LocalhostSessionSync.instance;
  }

  /**
   * Vérifie si on est en environnement localhost
   */
  private isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('localhost');
  }

  /**
   * Synchronise la session via redirection avec paramètres URL
   */
  async syncSessionViaRedirect(targetUrl: string): Promise<void> {
    if (!this.isLocalhost() || typeof window === 'undefined') return;

    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Encoder la session dans l'URL
        const sessionData = encodeURIComponent(JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user
        }));
        
        // Rediriger avec la session en paramètre
        const separator = targetUrl.includes('?') ? '&' : '?';
        window.location.href = `${targetUrl}${separator}session=${sessionData}`;
      } else {
        // Pas de session, rediriger normalement
        window.location.href = targetUrl;
      }
      } catch {
      // En cas d'erreur, rediriger normalement
      window.location.href = targetUrl;
    }
  }

  /**
   * Restaure la session depuis les paramètres URL
   */
  async restoreSessionFromUrl(): Promise<boolean> {
    if (!this.isLocalhost() || typeof window === 'undefined') return false;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionParam = urlParams.get('session');
      
      if (!sessionParam) return false;

      const sessionData = JSON.parse(decodeURIComponent(sessionParam));
      
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      });

      if (!error) {
        // Nettoyer l'URL des paramètres de session
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('session');
        window.history.replaceState({}, '', newUrl.toString());
        
        return true;
      }
      
      return false;
      } catch {
      return false;
    }
  }

  /**
   * Initialise la synchronisation localhost
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.isLocalhost()) return;
    
    this.isInitialized = true;
    
    // Essayer de restaurer la session depuis l'URL
    await this.restoreSessionFromUrl();
  }
}

// Instance globale
export const localhostSessionSync = LocalhostSessionSync.getInstance();
