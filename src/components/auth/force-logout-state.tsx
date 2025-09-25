/**
 * Composant qui force un état déconnecté complet quand des paramètres de déconnexion sont détectés
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function ForceLogoutState() {
  const searchParams = useSearchParams();
  const [isLogoutDetected, setIsLogoutDetected] = useState(false);

  useEffect(() => {
    const isLogout = searchParams.get('logout');
    
    if (isLogout && !isLogoutDetected) {
      setIsLogoutDetected(true);
      
      // Forcer un nettoyage complet de tous les états
      if (typeof window !== 'undefined') {
        // Nettoyer localStorage
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
        
        // Nettoyer sessionStorage
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
        
        // Nettoyer les cookies
        document.cookie.split(";").forEach(function(c) { 
          const cookieName = c.split("=")[0].trim();
          if (cookieName.includes('sb-') || 
              cookieName.includes('supabase') || 
              cookieName.includes('auth') || 
              cookieName.includes('session') ||
              cookieName.includes('cross-domain')) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
        
        // Nettoyer l'URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('logout');
        newUrl.searchParams.delete('t');
        newUrl.searchParams.delete('force_reload');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Forcer un rechargement complet après un court délai
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    }
  }, [searchParams, isLogoutDetected]);

  // Si une déconnexion est détectée, ne rien rendre
  if (isLogoutDetected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Déconnexion en cours...</p>
        </div>
      </div>
    );
  }

  return null;
}
