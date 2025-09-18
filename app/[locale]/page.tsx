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
  MessageSquare,
  ArrowRight
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

export default function AgencyDashboard() {
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
          // Sur le domaine principal, rediriger vers la page d'accueil publique
          window.location.href = '/fr';
          return;
        }

        // Vérifier l'authentification (seulement sur les subdomains)
        const { data: { session }, error: sessionError } = await supabaseBrowser().auth.getSession();
        
        if (sessionError || !session) {
          // Rediriger vers la page de connexion au lieu d'afficher une erreur
          window.location.href = '/sign-in';
          return;
        }

        setIsAuthenticated(true);

        // Récupérer le subdomain depuis l'URL
        const subdomain = hostname.split('.')[0];
        
        if (!subdomain || subdomain === 'www' || subdomain === 'qgchatting') {
          // Rediriger vers la page d'accueil publique si pas de subdomain valide
          window.location.href = '/fr';
          return;
        }

        // Récupérer les informations de l'agence
        const response = await fetch(`/api/agency/status?subdomain=${subdomain}`);
        const data = await response.json();
        
        if (data.ok) {
          // Rediriger automatiquement vers le dashboard au lieu d'afficher le contenu
          window.location.href = '/dashboard';
          return;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = 'https://qgchatting.com/fr'}
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
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
                <p className="text-sm text-gray-600">{agencyInfo?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Building2 className="w-3 h-3 mr-1" />
                {agencyInfo?.subdomain}.qgchatting.com
              </Badge>
              <Button 
                onClick={() => {
                  supabaseBrowser().auth.signOut().then(() => {
                    window.location.href = 'https://qgchatting.com/fr';
                  });
                }}
                variant="ghost"
              >
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Status */}
        {subscription && (
          <div className="mb-8">
            {subscription.is_expiring_soon && !subscription.is_expired && (
              <Alert className="mb-6 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Votre abonnement expire dans {subscription.days_remaining} jour{subscription.days_remaining > 1 ? 's' : ''}. 
                  {userRole === 'owner' && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-orange-600 hover:text-orange-700 ml-2"
                      onClick={() => router.push('/subscription-renewal')}
                    >
                      Renouveler maintenant
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenue dans votre agence
          </h2>
          <p className="text-gray-600">
            Gérez votre équipe, surveillez les performances et configurez vos paramètres.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Agency Info Card */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span>Informations de l'agence</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom de l'agence</label>
                  <p className="text-lg font-semibold text-gray-900">{agencyInfo?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sous-domaine</label>
                  <p className="text-lg font-semibold text-gray-900">{agencyInfo?.subdomain}.qgchatting.com</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Créée le</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {agencyInfo?.created_at ? new Date(agencyInfo.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span>Abonnement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Plan</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {subscription.plan_name}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Statut</span>
                    <Badge variant={subscription.is_active ? "default" : "destructive"}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Expire le</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Aucun abonnement actif</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-purple-600" />
                <span>Actions rapides</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Gérer l'équipe
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Statistiques
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Membres de l'équipe</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">U</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Utilisateur actuel</p>
                    <p className="text-xs text-gray-500">Propriétaire</p>
                  </div>
                </div>
                <Button variant="ghost" className="w-full text-blue-600">
                  + Inviter un membre
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span>Activité récente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Agence créée avec succès</p>
                    <p className="text-xs text-gray-500">Il y a quelques minutes</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Abonnement activé</p>
                    <p className="text-xs text-gray-500">Il y a quelques minutes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}