'use client';

/**
 * Gestionnaire PKCE amélioré pour la synchronisation cross-domain
 */
export class PKCECrossDomainManager {
  private static readonly STORAGE_KEY = 'supabase.auth.code_verifier';
  private static readonly CROSS_DOMAIN_STORAGE_KEY = 'cross-domain.pkce.code_verifier';
  
  /**
   * Génère un code verifier aléatoire
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
   * Génère un code challenge à partir du code verifier
   */
  static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Stocke le code verifier pour synchronisation cross-domain
   */
  static storeCodeVerifier(codeVerifier: string): void {
    if (typeof window !== 'undefined') {
      // Stockage local
      localStorage.setItem(this.STORAGE_KEY, codeVerifier);
      
      // Stockage cross-domain dans les cookies
      const cookieString = `${this.CROSS_DOMAIN_STORAGE_KEY}=${codeVerifier}; domain=.qgchatting.com; path=/; secure; samesite=lax; max-age=${60 * 60 * 24}`; // 24h
      document.cookie = cookieString;
      
      // Stockage sur le domaine principal
      const mainDomainCookie = `${this.CROSS_DOMAIN_STORAGE_KEY}=${codeVerifier}; domain=qgchatting.com; path=/; secure; samesite=lax; max-age=${60 * 60 * 24}`;
      document.cookie = mainDomainCookie;
    }
  }
  
  /**
   * Récupère le code verifier depuis le stockage cross-domain
   */
  static getStoredCodeVerifier(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Essayer d'abord localStorage
    const localVerifier = localStorage.getItem(this.STORAGE_KEY);
    if (localVerifier) return localVerifier;
    
    // Essayer les cookies cross-domain
    const cookieVerifier = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${this.CROSS_DOMAIN_STORAGE_KEY}=`))
      ?.split('=')[1];
    
    if (cookieVerifier) {
      // Restaurer dans localStorage
      localStorage.setItem(this.STORAGE_KEY, cookieVerifier);
      return cookieVerifier;
    }
    
    return null;
  }
  
  /**
   * Nettoie le code verifier stocké
   */
  static clearStoredCodeVerifier(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      
      // Nettoyer les cookies cross-domain
      const cookieString = `${this.CROSS_DOMAIN_STORAGE_KEY}=; domain=.qgchatting.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = cookieString;
      
      const mainDomainCookie = `${this.CROSS_DOMAIN_STORAGE_KEY}=; domain=qgchatting.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = mainDomainCookie;
    }
  }
  
  /**
   * Synchronise le code verifier entre domaines
   */
  static syncCodeVerifierAcrossDomains(): void {
    if (typeof window === 'undefined') return;
    
    const verifier = this.getStoredCodeVerifier();
    if (verifier) {
      this.storeCodeVerifier(verifier);
    }
  }
}

export const pkceCrossDomainManager = PKCECrossDomainManager;
