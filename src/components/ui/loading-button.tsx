/**
 * Bouton avec état de chargement intégré
 */
'use client';

import { Button } from './button';
import { LoadingSpinner } from './loading-screen';
import { ComponentProps } from 'react';

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
  loadingSpinner?: boolean;
}

export function LoadingButton({ 
  loading = false,
  loadingText,
  loadingSpinner = true,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Button 
      {...props}
      disabled={isDisabled}
      className={`${props.className || ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          {loadingSpinner && <LoadingSpinner size="sm" />}
          <span>{loadingText || 'Chargement...'}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
