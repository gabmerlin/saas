/**
 * Bouton de déconnexion unifié pour tous les domaines
 */
'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';

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
  const { isSigningOut, signOut } = useAuth();

  const handleLogout = async () => {
    if (isSigningOut || disabled) return;
    
    try {
      await signOut();
    } catch {
      // La redirection est gérée automatiquement par signOut
    }
  };

  return (
    <Button 
      onClick={handleLogout}
      variant={variant}
      size={size}
      disabled={isSigningOut || disabled}
      className={`${className} ${(isSigningOut || disabled) ? 'opacity-50' : ''}`}
    >
      {isSigningOut ? 'Déconnexion...' : children}
    </Button>
  );
}
