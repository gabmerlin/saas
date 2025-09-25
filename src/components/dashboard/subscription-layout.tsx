"use client";

import React from 'react';
import { useSubscriptionStatus } from '@/lib/hooks/use-subscription-status';
import ExpirationNotification from '@/components/dashboard/expiration-notification';

interface SubscriptionLayoutProps {
  children: React.ReactNode;
}

export default function SubscriptionLayout({ children }: SubscriptionLayoutProps) {
  const { subscription, userRole, loading, error } = useSubscriptionStatus();

  if (loading) {
    return <>{children}</>;
  }

  if (error || !subscription) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <ExpirationNotification
        subscription={subscription}
        userRole={userRole || 'employee'}
        onRenew={() => {
          // Rediriger vers la page de renouvellement
          window.location.href = '/onboarding/subscription-renewal';
        }}
      />
    </>
  );
}
