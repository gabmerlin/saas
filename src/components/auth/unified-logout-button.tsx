/**
 * Bouton de déconnexion unifié pour tous les domaines
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { crossDomainLogout } from '@/lib/auth/client/cross-domain-logout';

interface UnifiedLogoutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function UnifiedLogoutButton({ 
  variant = 'ghost', 
  size = 'sm', 
  className = '', 
  children = 'Se déconnecter',
  disabled = false
}: UnifiedLogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut || disabled) return;
    
    setIsLoggingOut(true);
    
    try {
      // Utiliser le système de déconnexion cross-domain unifié
      await crossDomainLogout.signOut();
    } catch (error) {
      // La redirection est gérée automatiquement par crossDomainLogout
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button 
      onClick={handleLogout}
      variant={variant}
      size={size}
      disabled={isLoggingOut || disabled}
      className={`${className} ${(isLoggingOut || disabled) ? 'opacity-50' : ''}`}
    >
      {isLoggingOut ? 'Déconnexion...' : children}
    </Button>
  );
}
