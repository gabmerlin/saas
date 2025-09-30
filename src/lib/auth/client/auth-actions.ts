/**
 * Actions d'authentification centralisées
 */
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';
import { sessionManager } from './session-manager';

// Connexion par email
export async function signInWithEmail(email: string, password: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Inscription par email
export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Connexion Google
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = supabaseBrowser();
  
  // Générer et stocker le code verifier pour PKCE
  const { PKCEHelper } = await import('@/lib/auth/pkce-helper');
  const codeVerifier = PKCEHelper.generateAndStore();
  console.log('🔑 Code verifier généré:', codeVerifier.substring(0, 20) + '...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
      scopes: 'email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Réinitialisation du mot de passe
export async function resetPassword(email: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Mise à jour du mot de passe
export async function updatePassword(newPassword: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Renvoyer l'email de vérification
export async function resendVerificationEmail(email: string) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Déconnexion
export async function signOut() {
  // Utiliser le système de déconnexion cross-domain unifié
  const { crossDomainLogout } = await import('./cross-domain-logout');
  await crossDomainLogout.signOut();
}

// Obtenir la session actuelle
export async function getCurrentSession() {
  return await sessionManager.getCurrentSession();
}
