/**
 * Écran de chargement spécialisé pour l'onboarding
 */
'use client';

import { QGLogo } from './qg-logo';

interface OnboardingLoadingProps {
  step?: string;
  message?: string;
  progress?: number;
}

export function OnboardingLoading({ 
  step = "Étape 1",
  message = "Configuration de votre agence...",
  progress = 0
}: OnboardingLoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="mb-8 animate-scale-in">
          <QGLogo size="lg" />
        </div>

        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">{step}</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Spinner animé */}
        <div className="h-12 w-12 mx-auto mb-6 relative animate-spin">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>

        {/* Message principal */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2 animate-fade-in-delay">
          {message}
        </h2>

        {/* Sous-message */}
        <p className="text-gray-600 text-sm animate-fade-in-delay-2">
          Veuillez patienter, nous préparons tout pour vous...
        </p>

        {/* Points de chargement animés */}
        <div className="flex justify-center space-x-1 mt-6 animate-fade-in-delay-3">
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
