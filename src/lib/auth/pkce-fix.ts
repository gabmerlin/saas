'use client';

/**
 * Fix PKCE pour éviter l'erreur 400 Bad Request
 * Solution simple et robuste
 */

export class PKCEFix {
  private static readonly STORAGE_KEY = 'supabase.auth.code_verifier';
  private static readonly COOKIE_KEY = 'pkce_code_verifier';
  
  /**
   * Génère un code verifier
   */
  static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Stocke le code verifier de manière cross-domain
   */
  static storeCodeVerifier(codeVerifier: string): void {
    if (typeof window === 'undefined') return;
    
    // Stockage localStorage
    localStorage.setItem(this.STORAGE_KEY, codeVerifier);
    
    // Stockage cookie cross-domain
    const cookieString = `${this.COOKIE_KEY}=${codeVerifier}; domain=.qgchatting.com; path=/; secure; samesite=lax; max-age=${60 * 60 * 24}`;
    document.cookie = cookieString;
  }
  
  /**
   * Récupère le code verifier
   */
  static getCodeVerifier(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Essayer localStorage d'abord
    let verifier = localStorage.getItem(this.STORAGE_KEY);
    
    if (!verifier) {
      // Essayer les cookies
      verifier = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${this.COOKIE_KEY}=`))
        ?.split('=')[1] || null;
      
      if (verifier) {
        // Restaurer dans localStorage
        localStorage.setItem(this.STORAGE_KEY, verifier);
      }
    }
    
    return verifier;
  }
  
  /**
   * Nettoie le code verifier
   */
  static clearCodeVerifier(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.STORAGE_KEY);
    
    // Nettoyer le cookie
    const cookieString = `${this.COOKIE_KEY}=; domain=.qgchatting.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = cookieString;
  }
}

export const pkceFix = PKCEFix;
