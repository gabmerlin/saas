'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from "@/components/ui/loading-screen";
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Loader2, Building2, Globe, Server, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseBrowserWithCookies } from '@/lib/supabase/client-global';
import { usePageTitle } from '@/lib/hooks/use-page-title';

interface AgencyInfo {
  name: string;
  subdomain: string;
  url: string;
}

interface CheckStatus {
  dns: 'pending' | 'checking' | 'success' | 'error';
  ssl: 'pending' | 'checking' | 'success' | 'error';
  server: 'pending' | 'checking' | 'success' | 'error';
  database: 'pending' | 'checking' | 'success' | 'error';
}

export default function AgencyInitializingPage() {
  const router = useRouter();
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>({
    dns: 'pending',
    ssl: 'pending',
    server: 'pending',
    database: 'pending'
  });
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Définir le titre de la page
  usePageTitle("Initialisation - QG Chatting");

  useEffect(() => {
    const checkExistingAgency = async () => {
      try {
        // Utiliser la même méthode que OwnerGuard
        const { data: { user }, error: userError } = await supabaseBrowserWithCookies().auth.getUser();
        
        if (userError || !user) {
          setError("Pas d'utilisateur authentifié");
          setLoading(false);
          return;
        }

        // Récupérer la session pour obtenir le token d'accès
        const { data: { session }, error: sessionError } = await supabaseBrowserWithCookies().auth.getSession();
        
        if (sessionError || !session) {
          setError("Pas de session valide");
          setLoading(false);
          return;
        }
        
        const response = await fetch("/api/auth/check-existing-agency", {
          method: "GET",
          headers: {
            "authorization": `Bearer ${session.access_token}`,
            "x-session-token": session.access_token
          }
        });

        const result = await response.json();

        if (result.ok && result.hasExistingAgency && result.agency) {
          setAgencyInfo(result.agency);
          setLoading(false);
          startInitializationChecks(result.agency);
        } else {
          setError("Aucune agence trouvée");
          setLoading(false);
        }
      } catch {
        setError("Erreur lors de la vérification de l'agence");
        setLoading(false);
      }
    };

    checkExistingAgency();
  }, []);

  const startInitializationChecks = async (agency: AgencyInfo) => {
        const checkInterval = setInterval(async () => {
          try {
            // Récupérer la session pour l'authentification
            const { data: { session }, error: sessionError } = await supabaseBrowserWithCookies().auth.getSession();
            
            if (sessionError || !session) {
              return;
            }

            const response = await fetch(`/api/agency/status?subdomain=${agency.subdomain}`, {
              method: 'GET',
              headers: {
                'authorization': `Bearer ${session.access_token}`,
                'x-session-token': session.access_token
              }
            });
            const result = await response.json();
        
        if (result.ok) {
          const { status } = result;
          
          // Mettre à jour le statut des vérifications
          setCheckStatus({
            dns: status.dns ? 'success' : 'checking',
            ssl: status.ssl ? 'success' : 'checking',
            server: status.server ? 'success' : 'checking',
            database: status.database ? 'success' : 'checking'
          });
          
          // Calculer le progrès
          const completedChecks = Object.values(status).filter(value => 
            typeof value === 'boolean' ? value : false
          ).length;
          const totalChecks = 4; // DNS, SSL, Server, Database
          const newProgress = Math.round((completedChecks / totalChecks) * 100);
          
          
          setProgress(newProgress);
          
          // Si tout est prêt, arrêter les vérifications
          if (result.ready) {
            clearInterval(checkInterval);
            setIsComplete(true);
            setTimeout(() => {
              window.location.href = agency.url;
            }, 2000);
          }
        }
      } catch {
        // Erreur lors de la vérification du statut
      }
    }, 3000); // Vérifier toutes les 3 secondes

    // Arrêter après 5 minutes maximum
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 300000);
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'checking':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Terminé';
      case 'checking':
        return 'En cours...';
      case 'error':
        return 'Erreur';
      default:
        return 'En attente';
    }
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Chargement des informations de l'agence"
        submessage="Récupération des détails de votre agence..."
        variant="default"
      />
    );
  }

  if (error || !agencyInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/auth/sign-in')} className="w-full">
            Retour à la connexion
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold">QG Chatting</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                Configuration en cours
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Votre agence <strong>{agencyInfo?.name}</strong> est en cours de configuration. 
                Nous préparons votre infrastructure pour une expérience optimale.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Infrastructure</h3>
                  <p className="text-blue-100 text-sm">Serveurs et base de données</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Sécurité</h3>
                  <p className="text-blue-100 text-sm">Certificats SSL et chiffrement</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">DNS</h3>
                  <p className="text-blue-100 text-sm">Configuration des domaines</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Right side - Content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
            >
          {/* Header */}
          <div className="text-center mb-8">
            <Building2 className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Initialisation de votre agence
            </h1>
            <p className="text-gray-600">
              <strong>{agencyInfo.name}</strong> est en cours de configuration
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {agencyInfo.subdomain}.qgchatting.com
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-blue-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Status Checks */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Configuration DNS</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(checkStatus.dns)}
                <span className="text-sm text-gray-600">
                  {getStatusText(checkStatus.dns)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Certificat SSL</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(checkStatus.ssl)}
                <span className="text-sm text-gray-600">
                  {getStatusText(checkStatus.ssl)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Serveur Web</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(checkStatus.server)}
                <span className="text-sm text-gray-600">
                  {getStatusText(checkStatus.server)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Building2 className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Base de données</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(checkStatus.database)}
                <span className="text-sm text-gray-600">
                  {getStatusText(checkStatus.database)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {isComplete ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Configuration terminée !
              </h3>
              <p className="text-gray-600 mb-4">
                Votre agence est maintenant opérationnelle. Redirection en cours...
              </p>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
            </div>
          ) : (
            <div className="text-center">
              <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Configuration en cours
              </h3>
              <p className="text-gray-600 mb-4">
                Veuillez patienter pendant que nous configurons votre infrastructure.
                Cela peut prendre quelques minutes.
              </p>
            </div>
          )}

          {/* Manual Redirect Button */}
          <div className="mt-6 text-center">
            <Button
              onClick={() => window.location.href = agencyInfo.url}
              variant="outline"
              className="w-full"
            >
              Accéder manuellement à l&apos;agence
            </Button>
          </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
