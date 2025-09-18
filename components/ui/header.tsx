'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function Header() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const supabase = supabaseBrowser();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    if (signingOut) return; // Éviter les clics multiples
    
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur lors de la déconnexion:', error);
        setSigningOut(false);
        return;
      }
      // Forcer le rechargement de la page pour s'assurer que l'état est réinitialisé
      window.location.href = '/sign-in';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <header className="fixed top-0 right-0 z-50 p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200">
          <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 truncate max-w-[200px]">
            {user.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {signingOut ? 'Déconnexion...' : 'Déconnexion'}
          </Button>
        </div>
      </div>
    </header>
  );
}
