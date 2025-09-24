"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Clock, Building2, ArrowRight, CheckCircle, AlertTriangle, Users, ClipboardList } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useSessionSync } from "@/lib/hooks/use-session-sync";
import { supabaseBrowser } from "@/lib/supabase/client";
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
  const { user, isAuthenticated } = useSessionSync();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Définir le titre de la page
  usePageTitle("Renouveler l'abonnement - QG Chatting");

  // Plans disponibles (chargés depuis la base de données)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer le subdomain depuis l'URL
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        // Vérifier si on est sur le domaine principal
        if (!subdomain || subdomain === 'www' || subdomain === 'qgchatting' || subdomain === 'localhost') {
          setError("Impossible de déterminer l'agence - accès depuis le domaine principal");
          setLoading(false);
          return;
        }

        // Récupérer la session pour le token
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("Session non trouvée - veuillez vous reconnecter");
          setLoading(false);
          return;
        }

        // Vérifier si l'utilisateur est owner directement via Supabase
        try {
          // Récupérer l'ID du tenant
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('id')
            .eq('subdomain', subdomain)
            .single();

          if (tenantData) {
            // Vérifier les rôles de l'utilisateur
            const { data: userRolesData, error: userRolesError } = await supabase
              .from('user_roles')
              .select(`
                roles!inner(key)
              `)
              .eq('user_id', session.user.id)
              .eq('tenant_id', (tenantData as any).id);

            // Vérifier aussi user_tenants
            const { data: userTenantData, error: userTenantError } = await supabase
              .from('user_tenants')
              .select('is_owner')
              .eq('user_id', session.user.id)
              .eq('tenant_id', (tenantData as any).id)
              .single();

            const userRoles = userRolesData?.map((ur: any) => ur.roles[0]?.key).filter(Boolean) || [];
            const isOwnerFromRoles = userRoles.includes('owner');
            const isOwnerFromTenants = (userTenantData as any)?.is_owner || false;
            const isOwner = isOwnerFromRoles || isOwnerFromTenants;
            
            console.log('🔍 SUBSCRIPTION-RENEWAL DEBUG (Direct DB):');
            console.log('- User ID:', session.user.id);
            console.log('- Tenant ID:', (tenantData as any).id);
            console.log('- User roles data:', userRolesData);
            console.log('- User roles error:', userRolesError);
            console.log('- User tenant data:', userTenantData);
            console.log('- User tenant error:', userTenantError);
            console.log('- User roles:', userRoles);
            console.log('- Is owner from roles:', isOwnerFromRoles);
            console.log('- Is owner from tenants:', isOwnerFromTenants);
            console.log('- Final is owner:', isOwner);
            
            if (!isOwner) {
              // Rediriger vers subscription-expired si ce n'est pas un owner
              console.log('❌ Not an owner, redirecting to subscription-expired');
              window.location.href = '/subscription-expired';
              return;
            }
          } else {
            console.log('❌ Tenant not found, redirecting to subscription-expired');
            window.location.href = '/subscription-expired';
            return;
          }
        } catch (error) {
          console.log('❌ Error checking user role directly:', error);
          window.location.href = '/subscription-expired';
          return;
        }

        // Charger les plans d'abonnement depuis la base de données
        const { data: plansData, error: plansError } = await supabase
          .from("subscription_plan")
          .select("id, name, price_usd, description, features, max_employees")
          .eq("is_active", true)
          .order("price_usd", { ascending: true });
        
        if (plansError) {
          console.error("Erreur lors du chargement des plans:", plansError);
        } else {
          // Transformer les données pour correspondre à l'interface Plan
          const transformedPlans: Plan[] = (plansData as any[] || []).map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            price: plan.price_usd,
            description: plan.description || "",
            features: plan.features || {}
          }));
          setAvailablePlans(transformedPlans);
        }

        // Récupérer les détails de l'abonnement
        const response = await fetch(`/api/subscription/status?subdomain=${subdomain}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        });
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

    fetchData();
  }, []);

  const handleRenewal = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentPopup(true);
  };

  const handlePaymentSuccess = (transactionId: string) => {
    console.log("Paiement réussi:", transactionId);
    // Rediriger vers l'agence après paiement réussi
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    window.location.href = `https://${subdomain}.qgchatting.com`;
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
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {availablePlans.map((plan) => {
                  const isLifetime = plan.name === "Lifetime";
                  const isPopular = plan.name === "Advanced";
                  
                  // Définir les limites selon le plan
                  const employeeLimit = (plan as any).max_employees || "Illimité";
                  const modelLimit = plan.name === "Lifetime" ? "Illimité" : 
                                   plan.name === "Professional" ? "25" :
                                   plan.name === "Advanced" ? "7" : "4";
                  
                  return (
                    <motion.div
                      key={plan.id}
                      whileHover={{ scale: 1.05 }}
                      className="cursor-pointer group relative h-full"
                    >
                      {/* Badge "Populaire" */}
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                            Populaire
                          </span>
                        </div>
                      )}

                      {/* Badge "Lifetime" */}
                      {isLifetime && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-yellow-900 text-xs font-semibold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <span>👑</span>
                            Lifetime
                          </span>
                        </div>
                      )}

                      <div className="h-full relative overflow-hidden rounded-2xl border-2 transition-all duration-500 flex flex-col group-hover:scale-105 group-hover:shadow-2xl border-gray-200 hover:border-gray-300 bg-white">
                        
                        {/* Effet de brillance au survol */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                        {/* Header avec nom et prix */}
                        <div className="p-8 pb-6 text-center relative">
                          <div className="mb-4">
                            <h5 className="text-2xl font-bold mb-2 text-gray-900">
                              {plan.name}
                            </h5>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-4xl font-bold text-orange-600">
                                {isLifetime ? "1199€" : `${plan.price}€`}
                              </span>
                              <span className="text-sm font-medium text-gray-500">
                                {isLifetime ? "" : "/mois"}
                              </span>
                            </div>
                            {isLifetime && (
                              <p className="text-sm font-semibold mt-1 text-orange-600">
                                Paiement unique
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="px-8 pb-6 flex-grow">
                          <p className="text-sm text-center leading-relaxed text-gray-600">
                            {plan.description}
                          </p>
                        </div>

                        {/* Limites principales */}
                        <div className="px-8 pb-8">
                          <div className="space-y-4">
                            {/* Limite d'employés */}
                            <div className="text-center">
                              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                                <Users className="w-4 h-4" />
                                <span>{employeeLimit} employés</span>
                              </div>
                            </div>

                            {/* Limite de modèles */}
                            <div className="text-center">
                              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-purple-50 text-purple-600">
                                <ClipboardList className="w-4 h-4" />
                                <span>{modelLimit} modèles</span>
                              </div>
                            </div>

                            {/* Fonctionnalités incluses */}
                            <div className="text-center">
                              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span>Toutes les fonctionnalités</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bouton d'action */}
                        <div className="p-8 pt-0">
                          <button
                            onClick={() => handleRenewal(plan)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-semibold"
                          >
                            Choisir ce plan
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
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
