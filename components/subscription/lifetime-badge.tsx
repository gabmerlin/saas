'use client';

import { Crown, Infinity, Users, Building2, Zap } from 'lucide-react';

interface LifetimeBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export default function LifetimeBadge({ className = '', showDetails = false }: LifetimeBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 ${className}`}>
      <Crown className="w-4 h-4" />
      <span>Lifetime</span>
      {showDetails && (
        <div className="flex items-center gap-1 ml-2">
          <Infinity className="w-3 h-3" />
          <Users className="w-3 h-3" />
          <Building2 className="w-3 h-3" />
          <Zap className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
