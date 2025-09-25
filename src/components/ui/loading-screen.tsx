/**
 * Écran de chargement professionnel et moderne
 */
'use client';

import { QGLogo } from './qg-logo';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
  showLogo?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'fullscreen';
}

export function LoadingScreen({ 
  message = 'Chargement...', 
  submessage,
  showLogo = true,
  size = 'md',
  variant = 'default'
}: LoadingScreenProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const containerClasses = {
    default: 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center',
    minimal: 'flex items-center justify-center p-8',
    fullscreen: 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'
  };

  return (
    <div className={containerClasses[variant]}>
      <div className="text-center animate-fade-in">
        {/* Logo */}
        {showLogo && (
          <div className="mb-8 animate-scale-in">
            <QGLogo size="lg" />
          </div>
        )}

        {/* Spinner animé */}
        <div className={`${sizeClasses[size]} mx-auto mb-6 relative animate-spin`}>
          <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>

        {/* Message principal */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2 animate-fade-in-delay">
          {message}
        </h2>

        {/* Sous-message */}
        {submessage && (
          <p className="text-gray-600 text-sm animate-fade-in-delay-2">
            {submessage}
          </p>
        )}

        {/* Points de chargement animés */}
        <div className="flex justify-center space-x-1 mt-4 animate-fade-in-delay-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Composant de chargement minimal pour les boutons
 */
export function LoadingSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative animate-spin`}>
      <div className="absolute inset-0 rounded-full border-2 border-gray-300"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600"></div>
    </div>
  );
}

/**
 * Skeleton loader pour le contenu
 */
export function SkeletonLoader({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number, 
  className?: string 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className={`h-4 bg-gray-200 rounded mb-2 ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
