'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { getCurrentSubdomain } from '@/lib/utils/cross-domain-redirect';
import { Badge } from '@/components/ui/badge';

interface UserRole {
  role: string;
  description: string;
}

export function UserRoles() {
  const { user, isAuthenticated } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!isAuthenticated || !user) return;

      const subdomain = getCurrentSubdomain();
      if (!subdomain) return;

      try {
        const supabase = (await import('@/lib/supabase/client')).supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) return;

        const response = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'x-session-token': session.access_token
          }
        });

        if (response.ok) {
          const data = await response.json();
          const userRoles = data.status?.user_roles || [];
          
          // Mapper les rôles vers leurs descriptions
          const roleDescriptions: Record<string, string> = {
            'owner': 'Propriétaire',
            'admin': 'Administrateur',
            'manager': 'Manager',
            'employee': 'Employé',
            'marketing': 'Marketing'
          };

          const rolesWithDescriptions = userRoles.map((role: string) => ({
            role,
            description: roleDescriptions[role] || role
          }));

          setRoles(rolesWithDescriptions);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des rôles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRoles();
  }, [isAuthenticated, user]);

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement des rôles...</div>;
  }

  if (roles.length === 0) {
    return <div className="text-sm text-gray-500">Aucun rôle assigné</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role, index) => (
        <Badge 
          key={index}
          variant={role.role === 'owner' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {role.description}
        </Badge>
      ))}
    </div>
  );
}
