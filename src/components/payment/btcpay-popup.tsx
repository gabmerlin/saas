"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Loader2, CheckCircle, AlertCircle, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: Record<string, boolean>;
}

interface BTCPayPopupProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  selectedPlan: Plan;
  onPaymentSuccess: (transactionId: string) => void;
  onPaymentError: (error: string) => void;
  instagramAddon?: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    icon: <Bitcoin className="w-5 h-5" />,
    description: "Paiement en Bitcoin",
    enabled: true
  }
];

export default function BTCPayPopup({
  isOpen,
  onClose,
  tenantId,
  selectedPlan,
  onPaymentSuccess,
  onPaymentError,
  instagramAddon = false
}: BTCPayPopupProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("bitcoin");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod("bitcoin");
      setIsProcessing(false);
      setError(null);
      setPaymentStatus("idle");
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (!selectedMethod || !selectedPlan) return;

    setIsProcessing(true);
    setError(null);
    setPaymentStatus("processing");
    
    // Marquer qu'un paiement est en cours
    if (typeof window !== 'undefined') {
      localStorage.setItem('paymentInProgress', 'true');
    }

    try {
      // Récupérer le token d'authentification depuis Supabase
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Session non trouvée. Veuillez vous reconnecter.");
      }

      const response = await fetch("/api/btcpay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "x-session-token": session.access_token,
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          currency: selectedMethod === "bitcoin" ? "BTC" : selectedMethod === "usdt" ? "USDT" : "USDC",
          tenantId,
          instagramAddon: instagramAddon,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création de la facture");
      }

      
      // Ouvrir la page de paiement dans une nouvelle fenêtre
      const paymentWindow = window.open(
        data.paymentUrl,
        "btcpay_payment",
        "width=800,height=600,scrollbars=yes,resizable=yes"
      );

      if (!paymentWindow) {
        throw new Error("Impossible d'ouvrir la fenêtre de paiement. Vérifiez que les popups sont autorisés.");
      }

      // Vérifier le statut du paiement
      checkPaymentStatus(data.invoiceId, paymentWindow);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      setPaymentStatus("error");
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPaymentStatus = async (invoiceId: string, paymentWindow: Window | null) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        // Récupérer la session pour l'authentification
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          return;
        }

        const response = await fetch(`/api/btcpay/check-status/${invoiceId}`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "x-session-token": session.access_token,
          },
        });
        const data = await response.json();

        if (data.status === "paid") {
          setPaymentStatus("success");
          
          // Nettoyer le flag de paiement en cours
          if (typeof window !== 'undefined') {
            localStorage.removeItem('paymentInProgress');
          }
          
          // Fermer la fenêtre de paiement BTCPay si elle est encore ouverte
          try {
            if (paymentWindow && !paymentWindow.closed) {
              paymentWindow.close();
            }
          } catch {
            // Ignorer les erreurs de fermeture de fenêtre
          }
          
          try {
            const activateResponse = await fetch("/api/btcpay/check-and-activate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
                "x-session-token": session.access_token,
              },
              body: JSON.stringify({
                tenantId: tenantId
              })
            });
            const activateData = await activateResponse.json();
            if (activateData.ok) {
            } else {
            }
          } catch {
          }
          onPaymentSuccess(data.transactionId);
          return;
        }

        if (data.status === "expired" || data.status === "cancelled") {
          setPaymentStatus("error");
          setError("Le paiement a expiré ou été annulé");
          
          // Nettoyer le flag de paiement en cours
          if (typeof window !== 'undefined') {
            localStorage.removeItem('paymentInProgress');
          }
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Vérifier toutes les 5 secondes
        } else {
          setPaymentStatus("error");
          setError("Timeout - Vérifiez manuellement le statut de votre paiement");
        }
      } catch {
        setPaymentStatus("error");
        setError("Erreur lors de la vérification du paiement");
        
        // Nettoyer le flag de paiement en cours
        if (typeof window !== 'undefined') {
          localStorage.removeItem('paymentInProgress');
        }
      }
    };

    // Commencer la vérification après 2 secondes
    setTimeout(checkStatus, 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
                      <Bitcoin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Paiement BTCPay</CardTitle>
                      <CardDescription>
                        Paiement sécurisé en cryptomonnaies
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Résumé du plan sélectionné */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-2">Plan sélectionné</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{selectedPlan.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedPlan.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatPrice(selectedPlan.price)}</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPlan.name === "Lifetime" ? "à vie" : "/mois"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Méthodes de paiement */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Méthode de paiement</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {paymentMethods.map((method) => (
                      <motion.div
                        key={method.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          selectedMethod === method.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        } ${!method.enabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={() => method.enabled && setSelectedMethod(method.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-primary">
                            {method.icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {method.description}
                            </div>
                          </div>
                          {selectedMethod === method.id && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Statut du paiement */}
                {paymentStatus !== "idle" && (
                  <div className="p-4 rounded-lg border">
                    {paymentStatus === "processing" && (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <div>
                          <div className="font-medium">Traitement du paiement...</div>
                          <div className="text-sm text-muted-foreground">
                            Redirection vers BTCPay en cours
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentStatus === "success" && (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-green-500" />
                        <div>
                          <div className="font-medium text-green-700">Paiement confirmé !</div>
                          <div className="text-sm text-muted-foreground">
                            Votre agence est en cours de création... Veuillez patienter.
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentStatus === "error" && (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <div>
                          <div className="font-medium text-red-700">Erreur de paiement</div>
                          <div className="text-sm text-muted-foreground">
                            {error}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing || !selectedMethod}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Payer {selectedPlan ? formatPrice(selectedPlan.price) : "0,00 €"}
                      </>
                    )}
                  </Button>
                </div>

                {/* Informations de sécurité */}
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  <p>
                    Paiement sécurisé par BTCPay Server. Vos données sont protégées et ne sont jamais stockées.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
