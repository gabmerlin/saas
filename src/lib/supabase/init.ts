/**
 * Initialisation globale pour désactiver les logs GoTrueClient
 * Ce fichier doit être importé au début de l'application
 */

import './config';

// Désactiver les logs GoTrueClient au niveau global
if (typeof window !== 'undefined') {
  // Intercepter et filtrer les logs GoTrueClient
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleDebug = console.debug;
  
  // Mots-clés à filtrer
  const FILTER_KEYWORDS = [
    'GoTrueClient',
    'supabase',
    'auth',
    'session',
    'token',
    'refresh',
    'signIn',
    'signOut',
    'signUp',
    'exchangeCodeForSession',
    'getSession',
    'setSession',
    'onAuthStateChange'
  ];
  
  const shouldFilter = (message: string): boolean => {
    return FILTER_KEYWORDS.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalConsoleLog.apply(console, args);
    }
  };
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalConsoleError.apply(console, args);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  console.info = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalConsoleInfo.apply(console, args);
    }
  };
  
  console.debug = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalConsoleDebug.apply(console, args);
    }
  };
}

// Désactiver les logs au niveau de l'environnement Node.js
if (typeof process !== 'undefined') {
  // Désactiver les logs de debug pour les modules Supabase
  process.env.SUPABASE_DEBUG = 'false';
  process.env.DEBUG = '';
  
  // Intercepter les logs de process.stdout
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  
  process.stdout.write = function(chunk: any, encoding?: any, callback?: any) {
    const message = chunk.toString();
    if (!shouldFilter(message)) {
      return originalStdoutWrite.call(this, chunk, encoding, callback);
    }
    return true;
  };
  
  process.stderr.write = function(chunk: any, encoding?: any, callback?: any) {
    const message = chunk.toString();
    if (!shouldFilter(message)) {
      return originalStderrWrite.call(this, chunk, encoding, callback);
    }
    return true;
  };
}

// Fonction helper pour vérifier si un message doit être filtré
function shouldFilter(message: string): boolean {
  const FILTER_KEYWORDS = [
    'GoTrueClient',
    'supabase',
    'auth',
    'session',
    'token',
    'refresh',
    'signIn',
    'signOut',
    'signUp',
    'exchangeCodeForSession',
    'getSession',
    'setSession',
    'onAuthStateChange'
  ];
  
  return FILTER_KEYWORDS.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );
}
