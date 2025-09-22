"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Clock, Building2, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import BTCPayPopup from "@/components/payment/btcpay-popup";

interface SubscriptionDetails {
  subscription_id: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  days_remaining: number;
  is_active: boolean;
  is_expiring_soon: boolean;
  is_expired: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: Record<string, boolean>;
}

export default function SubscriptionRenewalPage() {
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Définir le titre de la page
  usePageTitle("Renouveler l'abonnement - QG Chatting");

  // Plans disponibles
  const availablePlans: Plan[] = [
    {
      id: "starter-plan",
      name: "Starter",
      price: 17.00,
      description: "Plan de base pour petites agences",
      features: {
        "shifts": true,
        "basic_reporting": true
      }
    },
    {
      id: "advanced-plan",
      name: "Advanced",
      price: 35.00,
      description: "Plan avancé pour agences moyennes",
      features: {
        "shifts": true,
        "advanced_reporting": true,
        "instagram_basic": true
      }
    },
    {
      id: "professional-plan",
      name: "Professional",
      price: 75.00,
      description: "Plan professionnel illimité",
      features: {
        "shifts": true,
        "advanced_reporting": true,
        "instagram_full": true,
        "competition": true
      }
    }
  ];

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      try {
        // Récupérer le subdomain depuis les headers
        const subdomain = document.querySelector('meta[name="tenant-subdomain"]')?.getAttribute('content');
        
        if (!subdomain) {
          setError("Impossible de déterminer l'agence");
          setLoading(false);
          return;
        }

        // Récupérer les détails de l'abonnement
        const response = await fetch(`/api/subscription/status?subdomain=${subdomain}`);
        const data = await response.json();

        if (data.ok) {
          setSubscriptionDetails(data.subscription);
          setTenantId(data.tenant_id);
        } else {
          setError(data.error || "Erreur lors de la récupération des détails");
        }
      } catch {
        setError("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionDetails();
  }, []);

  const handleRenewal = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentPopup(true);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    console.log("Paiement réussi:", transactionId);
    // Rediriger vers l'agence après paiement réussi
    window.location.href = `https://${document.querySelector('meta[name="tenant-subdomain"]')?.getAttribute('content')}.qgchatting.com`;
  };

  const handlePaymentError = (error: string) => {
    console.error("Erreur de paiement:", error);
    setError(error);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des détails de l&apos;abonnement...</p>
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
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-orange-600 via-red-700 to-pink-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold">QG Chatting</h1>
              </div>
              <h2 className="text-2xl font-semibold mb-4">
                Renouveler votre abonnement
              </h2>
              <p className="text-orange-100 text-lg leading-relaxed">
                Votre abonnement a expiré. Choisissez un plan pour continuer à utiliser votre agence.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Abonnement expiré</h3>
                  <p className="text-orange-100 text-sm">Renouvellement requis</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Accès suspendu</h3>
                  <p className="text-orange-100 text-sm">Jusqu&apos;au renouvellement</p>
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
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">QG Chatting</h1>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="h-8 w-8 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Renouveler votre abonnement
                </h1>
                <p className="text-gray-600 mb-6">
                  Votre abonnement a expiré. Choisissez un plan pour continuer à utiliser votre agence.
                </p>
                
                {subscriptionDetails && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm font-medium text-orange-800">Expiré le :</span>
                    </div>
                    <div className="text-sm font-mono text-orange-900">
                      {formatDate(subscriptionDetails.current_period_end)}
                    </div>
                  </div>
                )}
              </div>

              {/* Plans disponibles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {availablePlans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-orange-300 transition-all duration-200"
                  >
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                      <div className="text-3xl font-bold text-orange-600 mb-6">
                        ${plan.price}
                        <span className="text-sm font-normal text-gray-500">
                          {plan.name === "Lifetime" ? " à vie" : "/mois"}
                        </span>
                      </div>
                      
                      <ul className="text-sm text-gray-600 space-y-2 mb-6 text-left">
                        {Object.entries(plan.features).map(([feature]) => (
                          <li key={feature} className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature.replace('_', ' ')}
                          </li>
                        ))}
                      </ul>
                      
                      <button
                        onClick={() => handleRenewal(plan)}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                      >
                        Choisir ce plan
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Le renouvellement prendra effet à la fin de votre période d&apos;abonnement actuelle.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Popup de paiement */}
      {showPaymentPopup && selectedPlan && tenantId && (
        <BTCPayPopup
          isOpen={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
          tenantId={tenantId}
          selectedPlan={selectedPlan}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}
    </div>
  );
}
