/**
 * Système de messagerie cross-domain pour la synchronisation des sessions
 */
'use client';

import type { Session } from '@supabase/supabase-js';

const MESSAGE_TYPES = {
  SESSION_SYNC: 'SESSION_SYNC',
  SESSION_CLEAR: 'SESSION_CLEAR',
  SESSION_REQUEST: 'SESSION_REQUEST',
  SESSION_RESPONSE: 'SESSION_RESPONSE'
} as const;

export const crossDomainMessaging = {
  // Envoyer un message à tous les domaines
  broadcastMessage: (type: string, data?: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Envoyer à la fenêtre parent (si dans un iframe)
      if (window.parent !== window) {
        window.parent.postMessage({ type, data }, '*');
      }
      
      // Envoyer à toutes les fenêtres ouvertes
      window.postMessage({ type, data }, '*');
      
      // Envoyer à localStorage pour la persistance
      localStorage.setItem('cross_domain_message', JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
    }
  },

  // Écouter les messages cross-domain
  listenForMessages: (callback: (type: string, data?: any) => void) => {
    if (typeof window === 'undefined') return () => {};
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type) {
        callback(event.data.type, event.data.data);
      }
    };
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'cross_domain_message' && event.newValue) {
        try {
          const message = JSON.parse(event.newValue);
          callback(message.type, message.data);
        } catch (error) {
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  },

  // Synchroniser une session
  syncSession: (session: Session) => {
    crossDomainMessaging.broadcastMessage(MESSAGE_TYPES.SESSION_SYNC, session);
  },

  // Nettoyer une session
  clearSession: () => {
    crossDomainMessaging.broadcastMessage(MESSAGE_TYPES.SESSION_CLEAR);
  },

  // Demander la session actuelle
  requestSession: () => {
    crossDomainMessaging.broadcastMessage(MESSAGE_TYPES.SESSION_REQUEST);
  },

  // Répondre avec la session
  respondWithSession: (session: Session | null) => {
    crossDomainMessaging.broadcastMessage(MESSAGE_TYPES.SESSION_RESPONSE, session);
  },

  // Écouter les demandes de session
  listenForSessionRequests: (getSession: () => Promise<Session | null>) => {
    return crossDomainMessaging.listenForMessages(async (type, data) => {
      if (type === MESSAGE_TYPES.SESSION_REQUEST) {
        const session = await getSession();
        crossDomainMessaging.respondWithSession(session);
      }
    });
  },

  // Écouter les réponses de session
  listenForSessionResponses: (callback: (session: Session | null) => void) => {
    return crossDomainMessaging.listenForMessages((type, data) => {
      if (type === MESSAGE_TYPES.SESSION_RESPONSE) {
        callback(data);
      }
    });
  }
};
