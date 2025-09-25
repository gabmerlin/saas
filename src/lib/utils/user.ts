// lib/utils/user.ts

/**
 * Extrait le prénom de l'utilisateur depuis ses métadonnées ou son email
 */
export function getUserFirstName(user: any): string {
  if (!user) return 'Utilisateur';
  
  // Priorité 1: full_name depuis les métadonnées (Google OAuth)
  if (user.user_metadata?.full_name) {
    const firstName = user.user_metadata.full_name.split(' ')[0];
    if (firstName) return firstName;
  }
  
  // Priorité 2: name depuis les métadonnées
  if (user.user_metadata?.name) {
    const firstName = user.user_metadata.name.split(' ')[0];
    if (firstName) return firstName;
  }
  
  // Priorité 3: email - partie avant @
  if (user.email) {
    const emailName = user.email.split('@')[0];
    // Nettoyer le nom (enlever les points, underscores, etc.)
    const cleanName = emailName.replace(/[._-]/g, ' ');
    const firstName = cleanName.split(' ')[0];
    if (firstName) {
      // Capitaliser la première lettre
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
  }
  
  // Fallback
  return 'Utilisateur';
}

/**
 * Extrait le nom complet de l'utilisateur
 */
export function getUserFullName(user: any): string {
  if (!user) return 'Utilisateur';
  
  // Priorité 1: full_name depuis les métadonnées
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }
  
  // Priorité 2: name depuis les métadonnées
  if (user.user_metadata?.name) {
    return user.user_metadata.name;
  }
  
  // Fallback: prénom seulement
  return getUserFirstName(user);
}
