'use client';

import { useState, useEffect } from 'react';
import { isLifetimeTenant } from '@/lib/subscription';

export function useLifetimeStatus(tenantId?: string) {
  const [isLifetime, setIsLifetime] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIsLifetime(false);
      setIsLoading(false);
      return;
    }

    const checkLifetimeStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const status = await isLifetimeTenant(tenantId);
        setIsLifetime(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLifetime(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkLifetimeStatus();
  }, [tenantId]);

  return {
    isLifetime,
    isLoading,
    error,
    isNotLifetime: !isLoading && !error && !isLifetime
  };
}
