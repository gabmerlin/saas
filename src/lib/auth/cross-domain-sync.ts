'use client';

import type { Session } from '@supabase/supabase-js';

const CROSS_DOMAIN_SYNC_KEY = 'cross-domain-session-sync';

export class CrossDomainSync {
  private static instance: CrossDomainSync;
  private listeners: Array<(session: Session | null) => void> = [];
  private isProcessing = false;

  static getInstance(): CrossDomainSync {
    if (!CrossDomainSync.instance) {
      CrossDomainSync.instance = new CrossDomainSync();
    }
    return CrossDomainSync.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      // Écouter les messages de synchronisation
      window.addEventListener('message', this.handleMessage.bind(this));
      
      // Écouter les changements de localStorage (même domaine)
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  private handleMessage(event: MessageEvent) {
    if (event.data?.type === CROSS_DOMAIN_SYNC_KEY && !this.isProcessing) {
      const { session, action } = event.data;
      
      if (action === 'sync') {
        this.isProcessing = true;
        this.notifyListeners(session);
        setTimeout(() => {
          this.isProcessing = false;
        }, 100);
      }
    }
  }

  private handleStorageChange(event: StorageEvent) {
    if (event.key === 'sb-auth-token' && event.newValue) {
      try {
        const session = JSON.parse(event.newValue);
        this.notifyListeners(session);
      } catch (error) {
      }
    }
  }

  // Synchroniser la session avec d'autres domaines
  syncSession(session: Session | null, skipLocal = false) {
    if (typeof window === 'undefined') return;

    
    // Sauvegarder dans localStorage
    if (session) {
      localStorage.setItem('sb-auth-token', JSON.stringify(session));
    } else {
      localStorage.removeItem('sb-auth-token');
    }

    // Envoyer à tous les autres onglets/fenêtres
    window.postMessage({
      type: CROSS_DOMAIN_SYNC_KEY,
      action: 'sync',
      session: session
    }, '*');

    // Notifier les listeners locaux seulement si demandé
    if (!skipLocal) {
      this.notifyListeners(session);
    }
  }

  // Écouter les changements de session
  onSessionChange(callback: (session: Session | null) => void) {
    this.listeners.push(callback);
    
    // Retourner une fonction de nettoyage
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach(callback => {
      try {
        callback(session);
      } catch (error) {
      }
    });
  }

  // Récupérer la session actuelle
  getCurrentSession(): Session | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem('sb-auth-token');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }
}

// Instance globale
export const crossDomainSync = CrossDomainSync.getInstance();
