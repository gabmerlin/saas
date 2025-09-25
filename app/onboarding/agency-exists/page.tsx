"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Building2, ArrowRight, CheckCircle, AlertTriangle, Globe } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";

export default function AgencyExistsPage() {
  const router = useRouter();
  const [agencyInfo, setAgencyInfo] = useState<{
    name: string;
    subdomain: string;
    url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [paymentStatus, setPaymentStatus] = useState<{
    is_paid: boolean;
    is_accessible: boolean;
    payment_status: string;
    ready: boolean;
  } | null>(null);
  
  // Définir le titre de la page
  usePageTitle("Agence existante - QG Chatting");

  useEffect(() => {
    const checkExistingAgency = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabaseBrowser().auth.getSession();
        
        if (sessionError || !session) {
          router.push('/sign-in');
          return;
        }
        
        const authToken = session.access_token;
        
        const response = await fetch("/api/auth/check-existing-agency", {
          method: "GET",
          headers: { 
            "authorization": `Bearer ${authToken}`,
            "x-session-token": authToken
          }
        });
        
        const result = await response.json();
        
        if (result.ok && result.hasExistingAgency) {
          setAgencyInfo({
            name: result.agency.name,
            subdomain: result.agency.subdomain,
            url: result.agency.url
          });

          // Vérifier le statut de paiement de l'agence
          const statusResponse = await fetch(`/api/agency/status?subdomain=${result.agency.subdomain}`);
          const statusResult = await statusResponse.json();
          
          if (statusResult.ok) {
            setPaymentStatus({
              is_paid: statusResult.is_paid,
              is_accessible: statusResult.is_accessible,
              payment_status: statusResult.payment_status,
              ready: statusResult.ready
            });
          }
        } else {
          // Pas d'agence existante, rediriger vers l'onboarding
          router.push('/onboarding/owner');
        }
      } catch {
        setError("Une erreur est survenue lors de la vérification de votre agence.");
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingAgency();
  }, [router]);

  const handleRedirectToAgency = useCallback(() => {
    if (agencyInfo?.url) {
      window.location.href = agencyInfo.url;
    }
  }, [agencyInfo?.url]);

  // Compte à rebours pour la redirection automatique (seulement si accessible)
  useEffect(() => {
    if (agencyInfo?.url && paymentStatus?.is_accessible && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (agencyInfo?.url && paymentStatus?.is_accessible && countdown === 0) {
      handleRedirectToAgency();
    }
  }, [agencyInfo, paymentStatus, countdown, handleRedirectToAgency]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre agence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4"
        >
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/sign-in')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
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
                Votre agence vous attend
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                Nous avons détecté que vous avez déjà une agence active. 
                Accédez à votre espace de travail pour continuer à collaborer.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Agence Active</h3>
                  <p className="text-blue-100 text-sm">Votre espace de travail est prêt</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Accès Sécurisé</h3>
                  <p className="text-blue-100 text-sm">Connexion automatique en cours</p>
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
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Agence existante détectée
                </h1>
                <p className="text-gray-600 mb-6">
                  Vous avez déjà une agence : <strong className="text-blue-600">{agencyInfo?.name}</strong>
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-center mb-2">
                    <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">Sous-domaine :</span>
                  </div>
                  <code className="text-sm font-mono text-blue-900 bg-blue-100 px-3 py-1 rounded">
                    {agencyInfo?.subdomain}.qgchatting.com
                  </code>
                </div>

                {paymentStatus?.is_accessible ? (
                  <>
                    <button
                      onClick={handleRedirectToAgency}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                    >
                      Accéder à mon agence
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                    
                    <p className="text-xs text-gray-500 mt-4">
                      Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}...
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      Veuillez effectuer le paiement pour accéder à votre agence.
                    </p>
                    <button
                      onClick={() => router.push('/onboarding/owner')}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                    >
                      Retour à l&apos;onboarding
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
