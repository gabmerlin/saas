"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { syncSessionAcrossDomains, hasStoredSession, clearStoredSession } from "@/lib/auth/session-sync";
import { forceSessionSyncFromUrl } from "@/lib/auth/force-session-sync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Settings, CreditCard, Shield, Zap } from "lucide-react";

export default function DirectDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 [DIRECT DASHBOARD] Début de la vérification d\'authentification...');
        
        // Vérifier le domaine
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        console.log('🔍 [DASHBOARD] Vérification du domaine:', { hostname, subdomain });
        
        // Si on est sur le domaine principal (sans sous-domaine), afficher la page d'accueil
        if (!subdomain || subdomain === 'www' || subdomain === 'qgchatting' || subdomain === 'localhost') {
          console.log('✅ [DASHBOARD] Domaine principal détecté - Affichage de la page d\'accueil');
          setLoading(false);
          return;
        }
        
        console.log('✅ [DASHBOARD] Sous-domaine détecté, accès au dashboard de l\'agence');
        
        // Vérifier manuellement les tokens dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        console.log('🔍 [DIRECT DASHBOARD] Tokens détectés dans l\'URL:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken 
        });
        
        // D'abord essayer de forcer la synchronisation depuis l'URL
        const urlSyncSuccess = await forceSessionSyncFromUrl();
        console.log('🔄 [DIRECT DASHBOARD] Résultat de la synchronisation URL:', urlSyncSuccess);
        
        if (urlSyncSuccess) {
          // Si la synchronisation URL a réussi, récupérer la session
          const supabase = supabaseBrowser();
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          console.log('📋 [DIRECT DASHBOARD] Session après synchronisation URL:', { 
            hasSession: !!session, 
            hasUser: !!session?.user,
            userEmail: session?.user?.email,
            error: sessionError 
          });
          
          if (session?.user) {
            console.log('✅ [DIRECT DASHBOARD] Utilisateur trouvé, configuration de l\'état...');
            setUser(session.user);
            setLoading(false);
            
            // Récupérer les informations de l'agence
            const hostname = window.location.hostname;
            const subdomain = hostname.split('.')[0];
            
            if (subdomain && subdomain !== 'www' && subdomain !== 'qgchatting') {
              try {
                console.log('🏢 [DIRECT DASHBOARD] Récupération des informations de l\'agence pour:', subdomain);
                const agencyResponse = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  }
                });
                
                const agencyData = await agencyResponse.json();
                console.log('🏢 [DIRECT DASHBOARD] Données de l\'agence:', agencyData);
                if (agencyData.ok) {
                  setAgencyInfo(agencyData.status.agency);
                }
              } catch (agencyError) {
                console.error('❌ [DIRECT DASHBOARD] Erreur lors de la vérification de l\'agence:', agencyError);
              }
            }
            return;
          } else {
            console.warn('⚠️ [DIRECT DASHBOARD] Aucun utilisateur trouvé après synchronisation URL');
          }
        }
        
        // Si la synchronisation URL a échoué, essayer la synchronisation normale
        console.log('🔄 [DIRECT DASHBOARD] Tentative de synchronisation normale...');
        await syncSessionAcrossDomains();
        
        const supabase = supabaseBrowser();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📋 [DIRECT DASHBOARD] Session après synchronisation normale:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          error 
        });
        
        if (error || !session) {
          // Vérifier s'il y a une session stockée
          if (hasStoredSession()) {
            console.log('💾 [DIRECT DASHBOARD] Session stockée trouvée, tentative de récupération...');
            // Attendre plus longtemps et réessayer plusieurs fois
            let attempts = 0;
            const maxAttempts = 3;
            
            const retryAuth = async () => {
              attempts++;
              console.log(`🔄 [DIRECT DASHBOARD] Tentative ${attempts}/${maxAttempts}...`);
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              
              if (retrySession?.user) {
                console.log('✅ [DIRECT DASHBOARD] Session récupérée avec succès !');
                setUser(retrySession.user);
                setLoading(false);
              } else if (attempts < maxAttempts) {
                // Réessayer après un délai plus long
                console.log('⏳ [DIRECT DASHBOARD] Réessai dans 2 secondes...');
                setTimeout(retryAuth, 2000);
              } else {
                // Après plusieurs tentatives, afficher un message d'erreur au lieu de rediriger
                console.log('❌ [DIRECT DASHBOARD] Échec après plusieurs tentatives');
                setLoading(false);
                return;
              }
            };
            
            setTimeout(retryAuth, 1000);
            return;
          } else {
            console.log('❌ [DIRECT DASHBOARD] Aucune session stockée trouvée');
            // Afficher un message d'erreur au lieu de rediriger
            setLoading(false);
            return;
          }
        }

        setUser(session.user);

        // Récupérer les informations de l'agence
        const agencyHostname = window.location.hostname;
        const agencySubdomain = agencyHostname.split('.')[0];
        
        if (agencySubdomain && agencySubdomain !== 'www' && agencySubdomain !== 'qgchatting') {
          const response = await fetch(`/api/agency/status?subdomain=${agencySubdomain}`, {
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
        console.error('❌ [DIRECT DASHBOARD] Erreur lors de la vérification de l\'authentification:', error);
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

  // Vérifier si on est sur le domaine principal
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const subdomain = hostname.split('.')[0];
  const isMainDomain = !subdomain || subdomain === 'www' || subdomain === 'qgchatting' || subdomain === 'localhost';

  // Si on est sur le domaine principal, afficher la page d'accueil
  if (isMainDomain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Logo et informations de connexion intégrés */}
            <div className="flex justify-between items-center mb-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => window.location.href = '/sign-in'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Se connecter
                </Button>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                La solution de communication
                <span className="text-blue-600"> d'entreprise</span>
                <br />
                nouvelle génération
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Connectez vos équipes, collaborez efficacement et transformez votre façon de travailler 
                avec une plateforme sécurisée et intuitive.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
                  onClick={() => window.location.href = '/sign-in'}
                >
                  Commencer gratuitement
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-4 text-lg border-gray-300 hover:bg-gray-50"
                >
                  Voir la démo
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Pourquoi choisir QG Chatting ?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Une plateforme complète conçue pour les entreprises modernes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Sécurité Enterprise</CardTitle>
                  <CardDescription>
                    Chiffrement de bout en bout et conformité aux standards de sécurité les plus élevés
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Gestion d'équipe</CardTitle>
                  <CardDescription>
                    Invitez, gérez et organisez vos équipes avec des rôles et permissions personnalisables
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Performance optimisée</CardTitle>
                  <CardDescription>
                    Interface rapide et intuitive pour une productivité maximale
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h1>
          <p className="text-gray-600 mb-8">
            Vous devez vous connecter pour accéder au tableau de bord.
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
      </div>
    </div>
  );
}
