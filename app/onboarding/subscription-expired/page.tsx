"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Building2, ArrowRight } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useAuth } from "@/lib/hooks/use-auth";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function SubscriptionExpiredPage() {
  const { user, isAuthenticated } = useAuth();
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    plan_name: string;
    current_period_end: string;
    days_remaining: number;
  } | null>(null);

  // Définir le titre de la page
  usePageTitle("Abonnement expiré - QG Chatting");

  useEffect(() => {
    // Vérifier si l'utilisateur est un owner et rediriger vers subscription-renewal
    if (isAuthenticated && user) {
      // Vérifier le rôle de l'utilisateur
      const checkUserRole = async () => {
        try {
          const hostname = window.location.hostname;
          const subdomain = hostname.split('.')[0];
          
          if (subdomain && subdomain !== 'www' && subdomain !== 'qgchatting' && subdomain !== 'localhost') {
            // Récupérer la session pour le token
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              return;
            }
            
            const response = await fetch(`/api/agency/status?subdomain=${subdomain}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              }
            });
            const data = await response.json();
            
            
            if (data.ok && data.status?.user_roles?.includes('owner')) {
              // Rediriger vers subscription-renewal si c'est un owner
              window.location.href = '/onboarding/subscription-renewal';
              return;
            }
          }
        } catch (error) {
          // Erreur silencieuse
        }
      };
      
      checkUserRole();
    }

    // Récupérer les détails de l'abonnement depuis les headers
    const subscriptionExpires = document.querySelector('meta[name="subscription-expires"]')?.getAttribute('content');
    
    if (subscriptionExpires) {
      const endDate = new Date(subscriptionExpires);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      setSubscriptionDetails({
        plan_name: "Plan d'abonnement",
        current_period_end: subscriptionExpires,
        days_remaining: daysRemaining
      });
    }
  }, [isAuthenticated, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-red-600 via-orange-700 to-yellow-800 relative overflow-hidden">
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
                Accès temporairement suspendu
              </h2>
              <p className="text-red-100 text-lg leading-relaxed">
                L&apos;abonnement de votre agence a expiré. Contactez le propriétaire de l&apos;agence pour renouveler l&apos;accès.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Abonnement expiré</h3>
                  <p className="text-red-100 text-sm">Renouvellement requis</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Contactez le propriétaire</h3>
                  <p className="text-red-100 text-sm">Pour renouveler l&apos;accès</p>
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
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Abonnement expiré
                </h1>
                <p className="text-gray-600 mb-6">
                  L&apos;accès à votre agence a été temporairement suspendu en raison de l&apos;expiration de l&apos;abonnement.
                </p>
                
                {subscriptionDetails && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-red-800">Expiré le :</span>
                    </div>
                    <div className="text-sm font-mono text-red-900">
                      {formatDate(subscriptionDetails.current_period_end)}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Que faire maintenant ?</h3>
                    <ul className="text-sm text-blue-800 space-y-1 text-left">
                      <li>• Contactez le propriétaire de l&apos;agence</li>
                      <li>• Demandez le renouvellement de l&apos;abonnement</li>
                      <li>• L&apos;accès sera rétabli après paiement</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => window.location.href = '/auth/sign-in'}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                  >
                    Retour à la connexion
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
