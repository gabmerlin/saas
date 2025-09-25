/**
 * Logo QG Chatting avec animations
 */
'use client';

interface QGLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export function QGLogo({ size = 'md', animated = true, className = '' }: QGLogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className} ${animated ? 'animate-fade-in' : ''}`}>
      {/* Icône de chat */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-200`}>
        <svg 
          className="w-2/3 h-2/3 text-white"
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      </div>

      {/* Texte QG Chatting */}
      <div className={animated ? 'animate-slide-in' : ''}>
        <h1 className={`font-bold text-gray-800 ${textSizes[size]}`}>
          QG <span className="text-blue-600">Chatting</span>
        </h1>
      </div>
    </div>
  );
}
