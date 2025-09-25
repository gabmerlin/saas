"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Settings, CreditCard, Shield } from "lucide-react";
import { getUserFirstName } from "@/lib/utils/user";
import { crossDomainSessionSync } from "@/lib/auth/client/cross-domain-session-sync";
import { localhostSessionSync } from "@/lib/auth/client/localhost-session-sync";
import { UnifiedLogoutButton } from "@/components/auth/unified-logout-button";

export default function DirectDashboardPage() {
  const { isLoading: sessionLoading, user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agencyInfo, setAgencyInfo] = useState<{ name: string; subdomain: string; url: string } | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ is_expired: boolean; days_until_expiration: number; is_expiring_soon?: boolean; status?: string; days_remaining?: number; plan_name?: string } | null>(null);

  useEffect(() => {
    const checkAgencyInfo = async () => {
      // D'abord, initialiser la synchronisation localhost
      await localhostSessionSync.initialize();
      
      // Ensuite, essayer de restaurer la session cross-domain
      if (!isAuthenticated) {
        const restored = await crossDomainSessionSync.restoreSessionInSupabase();
        if (!restored) {
          setLoading(false);
          return;
        }
        
        // Attendre un peu pour que le hook useAuth se mette à jour
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Vérifier à nouveau après restauration
        const supabase = supabaseBrowser();
        const { data: { session: restoredSession } } = await supabase.auth.getSession();
        if (!restoredSession) {
          setLoading(false);
          return;
        }
      }

      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        // Vérifier le domaine
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        // Si on est sur le domaine principal (sans sous-domaine), rediriger vers la page d'accueil
        if (!subdomain || subdomain === 'www' || subdomain === 'qgchatting' || subdomain === 'localhost') {
          window.location.href = '/home';
          return;
        }

        // Récupérer les informations de l'agence
        const agencyHostname = window.location.hostname;
        const agencySubdomain = agencyHostname.split('.')[0];
        
        if (agencySubdomain && agencySubdomain !== 'www' && agencySubdomain !== 'qgchatting') {
          try {
            // Récupérer la session pour le token
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              const response = await fetch(`/api/agency/status?subdomain=${agencySubdomain}`, {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                }
              });
              
              const data = await response.json();
              
              if (data.ok) {
                setAgencyInfo(data.status.agency);
                setSubscriptionInfo(data.subscription);
                
                // Vérifier si l'abonement est expiré et rediriger si nécessaire
                if (data.subscription?.is_expired) {
                  // Vérifier le rôle de l'utilisateur pour rediriger vers la bonne page
                  const userRoles = data.status?.user_roles || [];
                  const isOwner = userRoles.includes('owner');
                  
                  
                  if (isOwner) {
                    window.location.href = '/onboarding/subscription-renewal';
                  } else {
                    window.location.href = '/onboarding/subscription-expired';
                  }
                  return;
                }
              }
            }
          } catch {
            // Erreur silencieuse
          }
        }
      } catch {
        // Erreur silencieuse
      } finally {
        setLoading(false);
      }
    };

    if (!sessionLoading) {
      checkAgencyInfo();
    }
  }, [isAuthenticated, user, sessionLoading]);

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h1>
          <p className="text-gray-600 mb-8">
            Vous devez vous connecter pour accéder au tableau de bord.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/auth/sign-in?next=/dashboard'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Se connecter maintenant
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Rediriger vers la page d'accueil du sous-domaine ou du domaine principal
                const hostname = window.location.hostname;
                const subdomain = hostname.split('.')[0];
                
                if (subdomain && subdomain !== 'www' && subdomain !== 'qgchatting' && subdomain !== 'localhost') {
                  // Rester sur le sous-domaine
                  window.location.href = '/';
                } else {
                  // Aller au domaine principal
                  window.location.href = 'https://qgchatting.com/fr';
                }
              }}
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {agencyInfo?.name || 'Tableau de bord'}
            </h1>
            <p className="text-gray-600 mt-2">
              Bienvenue, {getUserFirstName(user)}
            </p>
          </div>
          
          <UnifiedLogoutButton 
            variant="outline"
          />
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Messages aujourd'hui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Équipe</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">
                Membre(s) actif(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paramètres</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Configuration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnement</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                subscriptionInfo?.is_expired 
                  ? 'text-red-600' 
                  : subscriptionInfo?.is_expiring_soon 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
              }`}>
                {subscriptionInfo?.is_expired 
                  ? 'Expiré' 
                  : subscriptionInfo?.is_expiring_soon 
                    ? 'Expire bientôt' 
                    : subscriptionInfo?.status === 'active' 
                      ? 'Actif' 
                      : subscriptionInfo?.status || 'Inconnu'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {subscriptionInfo?.is_expired 
                  ? 'Renouvellement requis' 
                  : subscriptionInfo?.is_expiring_soon 
                    ? `${subscriptionInfo?.days_remaining} jours restants` 
                    : subscriptionInfo?.plan_name || 'Aucun abonnement'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Alert */}
        {subscriptionInfo?.is_expiring_soon && !subscriptionInfo?.is_expired && (
          <Card className="mt-8 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Abonnement expire bientôt
              </CardTitle>
              <CardDescription className="text-yellow-700">
                Votre abonement expire dans {subscriptionInfo.days_remaining} jours. 
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => window.location.href = '/onboarding/subscription-renewal'}
                >
                  Renouveler maintenant
                </Button>
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Welcome Message */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Bienvenue dans votre agence !</CardTitle>
            <CardDescription>
              Votre agence a été créée avec succès. Vous pouvez maintenant commencer à utiliser toutes les fonctionnalités.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                🎉 Félicitations ! Votre agence <strong>{agencyInfo?.name}</strong> est maintenant active.
              </p>
              <p className="text-sm text-gray-600">
                Vous pouvez commencer à inviter des membres de votre équipe et configurer vos paramètres.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
