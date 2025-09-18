"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { syncSessionAcrossDomains, hasStoredSession, clearStoredSession } from "@/lib/auth/session-sync";
import { forceSessionSyncFromUrl, isSessionValid } from "@/lib/auth/force-session-sync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Settings, CreditCard } from "lucide-react";
import SessionDebug from "@/components/debug/session-debug";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);

  // Rediriger automatiquement vers la page de connexion si pas de session
  useEffect(() => {
    if (!user && !loading) {
      window.location.href = '/sign-in?next=/dashboard';
    }
  }, [user, loading]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // D'abord essayer de forcer la synchronisation depuis l'URL
        const urlSyncSuccess = await forceSessionSyncFromUrl();
        
        if (urlSyncSuccess) {
          // Si la synchronisation URL a réussi, récupérer la session
          const supabase = supabaseBrowser();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setUser(session.user);
            setLoading(false);
            
            // Récupérer les informations de l'agence
            const hostname = window.location.hostname;
            const subdomain = hostname.split('.')[0];
            
            if (subdomain && subdomain !== 'www' && subdomain !== 'qgchatting') {
              try {
                const agencyResponse = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  }
                });
                
                const agencyData = await agencyResponse.json();
                if (agencyData.ok) {
                  setAgencyInfo(agencyData.status.agency);
                }
              } catch (agencyError) {
                console.error('Erreur lors de la vérification de l\'agence:', agencyError);
              }
            }
            return;
          }
        }
        
        // Si la synchronisation URL a échoué, essayer la synchronisation normale
        await syncSessionAcrossDomains();
        
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          // Vérifier s'il y a une session stockée
          if (hasStoredSession()) {
            // Attendre plus longtemps et réessayer plusieurs fois
            let attempts = 0;
            const maxAttempts = 3;
            
            const retryAuth = async () => {
              attempts++;
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              
              if (retrySession?.user) {
                setUser(retrySession.user);
                setLoading(false);
              } else if (attempts < maxAttempts) {
                // Réessayer après un délai plus long
                setTimeout(retryAuth, 2000);
              } else {
                // Après plusieurs tentatives, afficher un message d'erreur au lieu de rediriger
                setLoading(false);
                return;
              }
            };
            
            setTimeout(retryAuth, 1000);
            return;
          } else {
            // Afficher un message d'erreur au lieu de rediriger
            setLoading(false);
            return;
          }
        }

        setUser(session.user);

        // Récupérer les informations de l'agence
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        if (subdomain && subdomain !== 'www' && subdomain !== 'qgchatting') {
          const response = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            }
          });
          
          const data = await response.json();
          if (data.ok) {
            setAgencyInfo(data.status.agency);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Redirection en cours...</h1>
          <p className="text-gray-600 mb-8">
            Vous allez être redirigé vers la page de connexion.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/sign-in?next=/dashboard'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Se connecter maintenant
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
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
              Bienvenue, {user?.email}
            </p>
          </div>
          
          <Button 
            onClick={async () => {
              const supabase = supabaseBrowser();
              await supabase.auth.signOut();
              // Nettoyer la session stockée
              clearStoredSession();
              window.location.href = '/';
            }}
            variant="outline"
          >
            Se déconnecter
          </Button>
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
              <div className="text-2xl font-bold">Actif</div>
              <p className="text-xs text-muted-foreground">
                Paiement effectué
              </p>
            </CardContent>
          </Card>
        </div>

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

        {/* Debug Session - À supprimer en production */}
        <div className="mt-8">
          <SessionDebug />
        </div>
      </div>
    </div>
  );
}
