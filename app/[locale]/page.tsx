"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Settings,
  BarChart3,
  MessageSquare
} from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useSubscriptionStatus } from "@/lib/hooks/use-subscription-status";
import { supabaseBrowser } from "@/lib/supabase/client";

interface AgencyInfo {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
  locale: string;
}

export default function SubdomainHomePage() {
  const router = useRouter();
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const { 
    subscription, 
    userRole, 
    loading: subscriptionLoading, 
    error: subscriptionError 
  } = useSubscriptionStatus();

  // Définir le titre de la page
  usePageTitle("Tableau de bord - QG Chatting");

  useEffect(() => {
    const checkAuthAndAgency = async () => {
      try {
        // Vérifier si on est sur le domaine principal
        const hostname = window.location.hostname;
        const isMainDomain = hostname === 'qgchatting.com' || hostname === 'www.qgchatting.com' || 
                           hostname === 'localhost:3000' || hostname === 'vercel.app';
        
        if (isMainDomain) {
          // Sur le domaine principal, rediriger vers la page d'accueil
          window.location.href = '/';
          return;
        }

        // Vérifier l'authentification (seulement sur les subdomains)
        const { data: { session }, error: sessionError } = await supabaseBrowser().auth.getSession();
        
        if (sessionError || !session) {
          setError('Non authentifié');
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Récupérer le subdomain depuis l'URL
        const subdomain = hostname.split('.')[0];
        
        if (!subdomain || subdomain === 'www' || subdomain === 'qgchatting') {
          setError('Subdomain requis pour accéder au tableau de bord');
          setLoading(false);
          return;
        }

        // Récupérer les informations de l'agence
        const response = await fetch(`/api/agency/status?subdomain=${subdomain}`);
        const data = await response.json();
        
        if (data.ok) {
          setAgencyInfo({
            id: data.status.agency.name,
            name: data.status.agency.name,
            subdomain: data.status.agency.subdomain,
            created_at: new Date().toISOString(),
            locale: 'fr'
          });
        } else {
          setError(data.error || 'Erreur lors du chargement des informations');
        }
      } catch {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndAgency();
  }, []);

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentification requise</h2>
          <p className="text-gray-600 mb-4">Veuillez vous connecter pour accéder à cette agence</p>
          <Button onClick={() => router.push('/sign-in')}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (error || subscriptionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || subscriptionError}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const getSubscriptionStatus = () => {
    if (!subscription) {
      return {
        status: 'no_subscription',
        message: 'Aucun abonnement actif',
        color: 'bg-gray-500',
        icon: AlertTriangle
      };
    }

    if (subscription.is_expired) {
      return {
        status: 'expired',
        message: 'Abonnement expiré',
        color: 'bg-red-500',
        icon: AlertTriangle
      };
    }

    if (subscription.is_expiring_soon) {
      return {
        status: 'expiring_soon',
        message: `Expire dans ${subscription.days_remaining} jour(s)`,
        color: 'bg-yellow-500',
        icon: Clock
      };
    }

    return {
      status: 'active',
      message: `Actif - ${subscription.days_remaining} jour(s) restant(s)`,
      color: 'bg-green-500',
      icon: CheckCircle
    };
  };

  const subscriptionStatus = getSubscriptionStatus();
  const StatusIcon = subscriptionStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informations de connexion intégrées */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {agencyInfo?.name || 'Tableau de bord'}
              </h1>
              <p className="text-sm text-gray-500">
                {agencyInfo?.subdomain && `${agencyInfo.subdomain}.qgchatting.com`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge 
              variant="outline" 
              className={`${subscriptionStatus.color} text-white border-0`}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {subscriptionStatus.message}
            </Badge>
            
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </div>
        </div>
        {/* Notifications d'abonnement */}
        {subscription && (subscription.is_expiring_soon || subscription.is_expired) && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {subscription.is_expired 
                ? "Votre abonnement a expiré. Veuillez le renouveler pour continuer à utiliser l'agence."
                : `Votre abonnement expire dans ${subscription.days_remaining} jour(s). Pensez à le renouveler.`
              }
              {userRole === 'owner' && (
                <Button 
                  size="sm" 
                  className="ml-4"
                  onClick={() => router.push('/subscription-renewal')}
                >
                  Renouveler
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Abonnement */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnement</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.plan_name || 'Aucun'}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription?.status || 'Non configuré'}
              </p>
              {subscription && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Expire le {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employés */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employés</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Aucun employé pour le moment
              </p>
            </CardContent>
          </Card>

          {/* Activité */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activité</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Messages aujourd'hui
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/employees')}
          >
            <Users className="h-6 w-6" />
            <span>Gérer les employés</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/messages')}
          >
            <MessageSquare className="h-6 w-6" />
            <span>Messages</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/analytics')}
          >
            <BarChart3 className="h-6 w-6" />
            <span>Analytiques</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-6 w-6" />
            <span>Paramètres</span>
          </Button>
        </div>

        {/* Informations de l'agence */}
        {agencyInfo && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Informations de l'agence</CardTitle>
              <CardDescription>
                Détails de votre agence et configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom de l'agence</label>
                  <p className="text-lg font-semibold">{agencyInfo.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sous-domaine</label>
                  <p className="text-lg font-semibold">{agencyInfo.subdomain}.qgchatting.com</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Créée le</label>
                  <p className="text-lg font-semibold">
                    {new Date(agencyInfo.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Langue</label>
                  <p className="text-lg font-semibold">
                    {agencyInfo.locale === 'fr' ? 'Français' : 'Anglais'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}