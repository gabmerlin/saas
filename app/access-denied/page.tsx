'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, ArrowLeft, Users, Shield, MessageSquare, Mail, ExternalLink, Building2, CheckCircle, Globe } from 'lucide-react';
import { getCurrentSubdomain, redirectToMainDomain } from '@/lib/utils/cross-domain-redirect';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { motion } from 'framer-motion';
import { usePageTitle } from '@/lib/hooks/use-page-title';

export default function AccessDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agencyInfo, setAgencyInfo] = useState<{ name: string; subdomain: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attemptedSubdomain, setAttemptedSubdomain] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  
  // Définir le titre de la page
  usePageTitle("Accès refusé - QG Chatting");

  useEffect(() => {
    const getAgencyInfo = async () => {
      try {
        // Récupérer le sous-domaine depuis les paramètres URL ou le domaine actuel
        const subdomainFromUrl = searchParams.get('subdomain');
        const currentSubdomain = getCurrentSubdomain();
        const subdomain = subdomainFromUrl || currentSubdomain;
        const reasonParam = searchParams.get('reason');
        
        if (subdomain) {
          setAttemptedSubdomain(subdomain);
          setReason(reasonParam);
          
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

  const handleContactSupport = () => {
    // Ouvrir l'email de support
    window.open('mailto:support@qgchatting.com?subject=Demande d\'accès à une agence', '_blank');
  };

  if (loading) {
    return (
      <LoadingScreen 
        message="Vérification des permissions"
        submessage="Contrôle de votre accès à cette agence..."
        variant="default"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-red-600 via-orange-700 to-pink-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold">QG Chatting</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                Accès non autorisé
              </h2>
              <p className="text-red-100 text-lg leading-relaxed">
                Vous tentez d'accéder à une agence pour laquelle vous n'avez pas les permissions nécessaires. 
                Contactez le propriétaire pour obtenir l'accès.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Sécurité Renforcée</h3>
                  <p className="text-red-100 text-sm">Protection des données d'entreprise</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Gestion d'Accès</h3>
                  <p className="text-red-100 text-sm">Contrôle des permissions par le propriétaire</p>
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
          <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6"
            >
              <div className="text-center">
                {/* Icône d'erreur avec animation */}
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </motion.div>
                
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {reason === 'not_found' ? 'Agence introuvable' : 'Accès refusé'}
                </h1>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {reason === 'not_found' 
                    ? `L'agence "${attemptedSubdomain}" n'existe pas ou a été supprimée.`
                    : 'Vous n\'avez pas les permissions nécessaires pour accéder à cette agence.'
                  }
                </p>
                
                {/* Informations sur l'agence */}
                {agencyInfo && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 mb-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">Agence :</span>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-blue-900 text-sm">{agencyInfo.name}</p>
                      <code className="text-xs font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded-md">
                        {agencyInfo.subdomain}.qgchatting.com
                      </code>
                    </div>
                  </div>
                )}

                {/* Raisons possibles */}
                <div className="text-left mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-gray-600" />
                    {reason === 'not_found' ? 'Pourquoi cette erreur ?' : 'Pourquoi cette erreur ?'}
                  </h3>
                  <div className="space-y-2">
                    {reason === 'not_found' ? (
                      <>
                        <motion.div 
                          className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-red-600 text-xs font-bold">1</span>
                          </div>
                          <p className="font-medium text-red-900 text-sm">L'agence n'existe pas</p>
                        </motion.div>
                        
                        <motion.div 
                          className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-600 text-xs font-bold">2</span>
                          </div>
                          <p className="font-medium text-orange-900 text-sm">L'agence a été supprimée</p>
                        </motion.div>
                        
                        <motion.div 
                          className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-yellow-600 text-xs font-bold">3</span>
                          </div>
                          <p className="font-medium text-yellow-900 text-sm">URL incorrecte</p>
                        </motion.div>
                      </>
                    ) : (
                      <>
                        <motion.div 
                          className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-red-600 text-xs font-bold">1</span>
                          </div>
                          <p className="font-medium text-red-900 text-sm">Pas membre de cette agence</p>
                        </motion.div>
                        
                        <motion.div 
                          className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-600 text-xs font-bold">2</span>
                          </div>
                          <p className="font-medium text-orange-900 text-sm">Invitation non acceptée</p>
                        </motion.div>
                        
                        <motion.div 
                          className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-yellow-600 text-xs font-bold">3</span>
                          </div>
                          <p className="font-medium text-yellow-900 text-sm">Mauvais compte connecté</p>
                        </motion.div>
                      </>
                    )}
                  </div>
                </div>

                {/* Solutions proposées */}
                <div className="text-left mb-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Que faire maintenant ?</h3>
                  <div className="space-y-2">
                    <motion.div 
                      className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="h-3 w-3 text-green-600" />
                      </div>
                      <p className="font-medium text-green-900 text-sm">Contactez le propriétaire</p>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="h-3 w-3 text-blue-600" />
                      </div>
                      <p className="font-medium text-blue-900 text-sm">Vérifiez votre connexion</p>
                    </motion.div>
                    
                    <motion.div 
                      className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-3 w-3 text-purple-600" />
                      </div>
                      <p className="font-medium text-purple-900 text-sm">Créez votre propre agence</p>
                    </motion.div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={handleGoHome}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center font-semibold text-sm shadow-lg hover:shadow-xl"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Retourner à l'accueil
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={handleContactSupport}
                      variant="outline"
                      className="w-full border-blue-200 hover:bg-blue-50 text-blue-600 px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center font-semibold text-sm hover:border-blue-300"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contacter le support
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={handleGoBack}
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors text-sm py-2.5"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Page précédente
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
