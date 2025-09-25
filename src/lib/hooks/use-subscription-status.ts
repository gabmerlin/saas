"use client";

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface SubscriptionDetails {
  subscription_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  days_remaining: number;
  is_active: boolean;
  is_expiring_soon: boolean;
  is_expired: boolean;
}

// Interface supprimée car non utilisée

export function useSubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer la session utilisateur
        const { data: { session }, error: sessionError } = await supabaseBrowser().auth.getSession();
        
        if (sessionError || !session) {
          setError('Non authentifié');
          setLoading(false);
          return;
        }

        // Récupérer le subdomain depuis les headers ou l'URL
        const subdomain = getSubdomainFromUrl();
        if (!subdomain) {
          // Si pas de subdomain, on est sur le domaine principal - pas d'abonnement à vérifier
          setLoading(false);
          return;
        }

        // Récupérer le rôle de l'utilisateur
        const { data: userRoleData, error: roleError } = await supabaseBrowser()
          .from('user_roles')
          .select(`
            roles(key),
            tenant_id
          `)
          .eq('user_id', session.user.id)
          .single();

        if (roleError || !userRoleData) {
          setError('Rôle utilisateur non trouvé');
          setLoading(false);
          return;
        }

        // Type assertion pour le rôle
        const roles = (userRoleData as any).roles as { key: string } | { key: string }[];
        const role = Array.isArray(roles) 
          ? roles[0]?.key 
          : roles?.key;
        
        setUserRole(role || 'employee');

        // Récupérer les détails de l'abonnement via l'API agency/status
        const response = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'x-session-token': session.access_token,
          },
        });

        const data = await response.json();

        if (data.ok && data.subscription) {
          setSubscription(data.subscription);
        } else {
          setError(data.error || 'Erreur lors de la récupération de l\'abonnement');
        }
      } catch (err) {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  return {
    subscription,
    userRole,
    loading,
    error
  };
}function getSubdomainFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  
  // Domaines par défaut pour la détection
  const defaultRoots = ['qgchatting.com', 'localhost:3000', 'vercel.app'];
  
  for (const root of defaultRoots) {
    if (hostname.endsWith(`.${root}`)) {
      const subdomain = hostname.replace(`.${root}`, '');
      // Ignorer 'www' et les domaines vides
      if (subdomain && subdomain !== 'www' && subdomain !== '') {
        return subdomain;
      }
    }
  }
  
  // Si on est sur le domaine principal (ex: www.qgchatting.com ou qgchatting.com)
  if (hostname === 'qgchatting.com' || hostname === 'www.qgchatting.com' || 
      hostname === 'localhost:3000' || hostname === 'vercel.app') {
    return null; // Pas de subdomain sur le domaine principal
  }
  
  return null;
}


