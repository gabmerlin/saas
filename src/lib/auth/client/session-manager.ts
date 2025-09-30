/**
 * Gestionnaire de session simplifié
 */
'use client';

import { supabaseBrowserWithCookies } from '@/lib/supabase/client-with-cookies';
import type { Session } from '@supabase/supabase-js';

export class SessionManager {
  private static instance: SessionManager;
  private listeners: Set<(session: Session | null) => void> = new Set();

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Écouter les changements d'état d'authentification
    const supabase = supabaseBrowserWithCookies();
    supabase.auth.onAuthStateChange((event: string, session: Session | null) => {

      // Notifier tous les listeners
      this.notifyListeners(session);
    });
  }



  private notifyListeners(session: Session | null) {
    this.listeners.forEach(listener => {
      try {
        listener(session);
      } catch {
      }
    });
  }

  // Méthodes publiques
  addListener(callback: (session: Session | null) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  async getCurrentSession(): Promise<Session | null> {
    const supabase = supabaseBrowserWithCookies();
    const { data: { session } } = await supabase.auth.getSession();
    return session as Session | null;
  }

  async signOut(): Promise<void> {
    const supabase = supabaseBrowserWithCookies();
    await supabase.auth.signOut();
  }
}

export const sessionManager = SessionManager.getInstance();

