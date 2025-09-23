"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Settings, CreditCard, Shield, Zap } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSessionSync } from "@/lib/hooks/use-session-sync";
import { redirectToAgencyDashboard } from "@/lib/auth/agency-redirect";

export default function HomePage() {
  const { isLoading: sessionLoading, user, isAuthenticated, signOut } = useSessionSync();
  const [userAgency, setUserAgency] = useState<{name: string; subdomain: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAgencyInfo = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        // Vérifier si on est sur le domaine principal
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        // Si on est sur un sous-domaine, rediriger vers le domaine principal
        if (subdomain && subdomain !== 'www' && subdomain !== 'qgchatting' && subdomain !== 'localhost') {
          const mainDomain = process.env.NODE_ENV === 'production' 
            ? 'https://qgchatting.com'
            : 'http://localhost:3000';
          window.location.href = `${mainDomain}/home`;
          return;
        }
        
        // Récupérer la session pour le token
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token) {
          // Vérifier si l'utilisateur a une agence
          try {
            const agencyResponse = await fetch('/api/auth/check-existing-agency', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'x-session-token': session.access_token
              }
            });
            
            const agencyData = await agencyResponse.json();
            if (agencyData.ok && agencyData.hasExistingAgency) {
              setUserAgency(agencyData.agency);
            }
          } catch (agencyError) {
            // Erreur silencieuse
          }
        }
      } catch (error) {
        // Erreur silencieuse
      } finally {
        setLoading(false);
      }
    };

    // Attendre que le chargement de session soit terminé
    if (!sessionLoading) {
      checkAgencyInfo();
    }
  }, [isAuthenticated, user, sessionLoading]);

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      if (userAgency) {
        // Rediriger vers le dashboard de l'agence avec la session synchronisée
        await redirectToAgencyDashboard(userAgency.subdomain);
      } else {
        // Rediriger vers l'onboarding
        window.location.href = '/fr/owner';
      }
    } else {
      // Rediriger vers la connexion
      window.location.href = '/sign-in';
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

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
              {isAuthenticated ? (
                <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm border border-white/20">
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-600">
                      <strong>{user?.email}</strong>
                    </span>
                    {userAgency && (
                      <span className="text-xs text-gray-500">
                        {userAgency.name}
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={async () => {
                      await signOut();
                      
                      // Rediriger vers la page d'accueil du domaine principal
                      const mainDomain = process.env.NODE_ENV === 'production' 
                        ? 'https://qgchatting.com'
                        : 'http://localhost:3000';
                      window.location.href = `${mainDomain}/home`;
                    }}
                    variant="ghost" 
                    size="sm"
                    className="text-gray-500 hover:text-red-600"
                  >
                    Se déconnecter
                  </Button>
                  <Button 
                    onClick={handleGetStarted}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {userAgency ? 'Mon agence' : 'Créer une agence'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={() => window.location.href = '/sign-in'}
                    variant="ghost"
                  >
                    Se connecter
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/sign-in'}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Commencer
                  </Button>
                </div>
              )}
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
                onClick={handleGetStarted}
              >
                {isAuthenticated ? (userAgency ? 'Accéder à mon agence' : 'Créer une agence') : 'Commencer gratuitement'}
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
