"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionNotificationProps {
  subscription: {
    plan_name: string;
    current_period_end: string;
    days_remaining: number;
    is_expiring_soon: boolean;
    is_expired: boolean;
  };
  userRole: string;
  onRenew?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function SubscriptionNotification({ 
  subscription, 
  userRole, 
  onRenew,
  onDismiss,
  className = "fixed top-4 left-4 right-4 z-50 max-w-4xl mx-auto"
}: SubscriptionNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Afficher la notification si l'abonnement expire bientôt et que l'utilisateur n'est pas employé
    if (subscription.is_expiring_soon && userRole !== 'employee' && !isDismissed) {
      setIsVisible(true);
    }
  }, [subscription.is_expiring_soon, userRole, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Stocker la dismissal dans localStorage pour cette session
    localStorage.setItem(`subscription-notification-dismissed-${subscription.current_period_end}`, 'true');
    
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleRenew = () => {
    if (onRenew) {
      onRenew();
    } else {
      // Rediriger vers la page de renouvellement
      window.location.href = '/subscription-renewal';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isVisible || subscription.is_expired) {
    return null;
  }

  return (
    <div className={className}>
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg shadow-lg border border-orange-200">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-orange-100" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Abonnement expire bientôt
                </h3>
                <p className="text-orange-100 text-sm mb-3">
                  Votre abonnement <strong>{subscription.plan_name}</strong> expire le{' '}
                  <strong>{formatDate(subscription.current_period_end)}</strong> 
                  {' '}(dans {subscription.days_remaining} jour{subscription.days_remaining > 1 ? 's' : ''}).
                </p>
                
                {userRole === 'owner' && (
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={handleRenew}
                      size="sm"
                      className="bg-white text-orange-600 hover:bg-orange-50 font-semibold"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Renouveler maintenant
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      size="sm"
                      className="text-orange-100 hover:bg-orange-400/20"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Me rappeler plus tard
                    </Button>
                  </div>
                )}
                
                {userRole !== 'owner' && (
                  <p className="text-orange-100 text-xs">
                    Contactez le propriétaire de l&apos;agence pour renouveler l&apos;abonnement.
                  </p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-orange-100 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
