// lib/auth/actions.ts
'use client';

import { supabaseBrowser } from '@/lib/supabase/client';
import { AUTH_CONFIG, GOOGLE_OAUTH_CONFIG } from './config';
import { redirect } from 'next/navigation';

const supabase = supabaseBrowser;

export async function signInWithEmail(email: string, password: string, rememberMe = false) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Configurer la durée de session selon Remember Me
  if (rememberMe) {
    await supabase.auth.setSession({
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
    });
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  // Validation côté client
  if (password.length < AUTH_CONFIG.MIN_PASSWORD_LENGTH) {
    throw new Error(`Le mot de passe doit contenir au moins ${AUTH_CONFIG.MIN_PASSWORD_LENGTH} caractères`);
  }

  if (AUTH_CONFIG.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins un caractère spécial');
  }

  if (AUTH_CONFIG.REQUIRE_NUMBERS && !/\d/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins un chiffre');
  }

  if (AUTH_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    throw new Error('Le mot de passe doit contenir au moins une majuscule');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: GOOGLE_OAUTH_CONFIG.SCOPES.join(' '),
      redirectTo: `${window.location.origin}${GOOGLE_OAUTH_CONFIG.REDIRECT_URL}`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }

  redirect('/auth/sign-in');
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function resendVerificationEmail() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Utilisateur non connecté');
  }

  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email!,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}