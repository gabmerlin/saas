/**
 * Configuration globale pour désactiver tous les logs Supabase/GoTrueClient
 */

// Désactiver les logs GoTrueClient au niveau global
if (typeof window !== 'undefined') {
  // Côté client - désactiver les logs dans la console
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log = (...args: unknown[]) => {
    // Filtrer les logs GoTrueClient
    const message = args.join(' ');
    if (!message.includes('GoTrueClient') && 
        !message.includes('supabase') && 
        !message.includes('auth') &&
        !message.includes('session') &&
        !message.includes('token')) {
      originalConsoleLog.apply(console, args);
    }
  };
  
  console.error = (...args: unknown[]) => {
    // Filtrer les erreurs GoTrueClient non critiques
    const message = args.join(' ');
    if (!message.includes('GoTrueClient') && 
        !message.includes('supabase') && 
        !message.includes('auth') &&
        !message.includes('session') &&
        !message.includes('token')) {
      originalConsoleError.apply(console, args);
    }
  };
  
  console.warn = (...args: unknown[]) => {
    // Filtrer les warnings GoTrueClient
    const message = args.join(' ');
    if (!message.includes('GoTrueClient') && 
        !message.includes('supabase') && 
        !message.includes('auth') &&
        !message.includes('session') &&
        !message.includes('token')) {
      originalConsoleWarn.apply(console, args);
    }
  };
}

// Configuration par défaut pour tous les clients Supabase
export const SUPABASE_CONFIG = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    debug: false, // Désactiver tous les logs de debug
    flowType: 'pkce' as const
  },
  global: {
    headers: {
      'x-application-name': 'qgchatting-saas'
    }
  }
};

// Configuration pour le serveur
export const SUPABASE_SERVER_CONFIG = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    debug: false, // Désactiver tous les logs de debug
    flowType: 'pkce' as const
  },
  global: {
    headers: {
      'x-application-name': 'qgchatting-saas'
    }
  }
};
