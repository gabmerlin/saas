"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Shield, 
  Users, 
  Zap, 
  ArrowRight,
  Building2,
  CreditCard,
  Globe,
  Lock
} from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAgency, setUserAgency] = useState<{name: string; subdomain: string} | null>(null);
  const [loading, setLoading] = useState(true);

  // Définir le titre de la page
  usePageTitle("QG Chatting - Solution de communication d'entreprise");

  useEffect(() => {
    // Vérifier si on est sur un subdomain
    const host = window.location.host;
    const isSubdomain = host.includes('.') && !host.startsWith('www.') && !host.includes('localhost');
    
    if (isSubdomain) {
      // Si on est sur un subdomain, rediriger vers la page locale
      window.location.href = '/fr';
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.ok && data.user) {
          setIsLoggedIn(true);
          
          // Vérifier si l'utilisateur a une agence
          const agencyResponse = await fetch('/api/auth/check-existing-agency', {
            headers: {
              'Authorization': `Bearer ${data.session.access_token}`,
              'x-session-token': data.session.access_token
            }
          });
          
          const agencyData = await agencyResponse.json();
          if (agencyData.ok && agencyData.hasExistingAgency) {
            setUserAgency(agencyData.agency);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      if (userAgency) {
        // Rediriger vers l'agence existante
        const subdomain = userAgency.subdomain;
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? `https://${subdomain}.qgchatting.com`
          : `http://${subdomain}.localhost:3000`;
        window.location.href = `${baseUrl}/dashboard`;
      } else {
        // Rediriger vers l'onboarding
        router.push('/fr/owner');
      }
    } else {
      // Rediriger vers la connexion
      router.push('/sign-in');
    }
  };

  if (loading) {
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
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  {userAgency && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Building2 className="w-3 h-3 mr-1" />
                      {userAgency.name}
                    </Badge>
                  )}
                  <Button 
                    onClick={handleGetStarted}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {userAgency ? 'Accéder à mon agence' : 'Créer une agence'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/sign-in">
                    <Button variant="ghost">Se connecter</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Commencer
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                {isLoggedIn ? (userAgency ? 'Accéder à mon agence' : 'Créer une agence') : 'Commencer gratuitement'}
                <ArrowRight className="w-5 h-5 ml-2" />
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

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Multi-tenant</CardTitle>
                <CardDescription>
                  Chaque agence dispose de son propre espace sécurisé et personnalisable
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Paiement Bitcoin</CardTitle>
                <CardDescription>
                  Paiements sécurisés et anonymes avec Bitcoin via BTCPay Server
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle className="text-xl">Confidentialité totale</CardTitle>
                <CardDescription>
                  Vos données restent privées et ne sont jamais partagées avec des tiers
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Prêt à transformer votre communication d'entreprise ?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Rejoignez des milliers d'entreprises qui font confiance à QG Chatting
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              onClick={handleGetStarted}
            >
              {isLoggedIn ? (userAgency ? 'Accéder à mon agence' : 'Créer une agence') : 'Commencer maintenant'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">QG Chatting</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Solution de communication d'entreprise nouvelle génération
            </p>
            <p className="text-sm text-gray-500">
              © 2024 QG Chatting. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
