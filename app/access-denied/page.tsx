'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, ArrowLeft, Users } from 'lucide-react';
import { getCurrentSubdomain, redirectToMainDomain } from '@/lib/utils/cross-domain-redirect';

export default function AccessDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agencyInfo, setAgencyInfo] = useState<{ name: string; subdomain: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attemptedSubdomain, setAttemptedSubdomain] = useState<string | null>(null);

  useEffect(() => {
    const getAgencyInfo = async () => {
      try {
        // Récupérer le sous-domaine depuis les paramètres URL ou le domaine actuel
        const subdomainFromUrl = searchParams.get('subdomain');
        const currentSubdomain = getCurrentSubdomain();
        const subdomain = subdomainFromUrl || currentSubdomain;
        
        if (subdomain) {
          setAttemptedSubdomain(subdomain);
          
          // Essayer de récupérer les informations de l'agence
          const response = await fetch(`/api/agency/status?subdomain=${subdomain}`);
          const data = await response.json();
          
          if (data.ok && data.agency) {
            setAgencyInfo({
              name: data.agency.name,
              subdomain: data.agency.subdomain
            });
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des informations de l\'agence:', error);
      } finally {
        setLoading(false);
      }
    };

    getAgencyInfo();
  }, [searchParams]);

  const handleGoHome = () => {
    redirectToMainDomain('/home');
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      redirectToMainDomain('/home');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Accès refusé
          </CardTitle>
          <CardDescription className="text-gray-600">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {agencyInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Agence : {agencyInfo.name}</span>
              </div>
              <p className="text-sm text-blue-700">
                Sous-domaine : {agencyInfo.subdomain}.qgchatting.com
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Pourquoi cette erreur ?</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Vous n'êtes pas membre de cette agence</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Votre compte n'a pas les permissions requises</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Votre invitation n'a pas encore été acceptée</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Que faire ?</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Contactez le propriétaire de l'agence pour une invitation</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Vérifiez que vous êtes connecté avec le bon compte</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>Retournez à la page d'accueil pour créer votre propre agence</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Button 
              onClick={handleGoHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Retourner à l'accueil
            </Button>
            
            <Button 
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Page précédente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
