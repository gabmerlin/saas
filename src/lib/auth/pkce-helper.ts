'use client';

/**
 * Gestionnaire PKCE simple pour l'authentification Supabase
 */
export class PKCEHelper {
  private static readonly STORAGE_KEY = 'supabase.auth.code_verifier';
  
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
   * Stocke le code verifier
   */
  static storeCodeVerifier(codeVerifier: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, codeVerifier);
    }
  }
  
  /**
   * Récupère le code verifier stocké
   */
  static getStoredCodeVerifier(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.STORAGE_KEY);
    }
    return null;
  }
  
  /**
   * Supprime le code verifier stocké
   */
  static clearCodeVerifier(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
  
  /**
   * Génère et stocke un nouveau code verifier
   */
  static generateAndStore(): string {
    const codeVerifier = this.generateCodeVerifier();
    this.storeCodeVerifier(codeVerifier);
    return codeVerifier;
  }
  
  /**
   * Vérifie si un code verifier existe
   */
  static hasCodeVerifier(): boolean {
    return this.getStoredCodeVerifier() !== null;
  }
  
  /**
   * Nettoyer tous les code verifiers
   */
  static cleanup(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
  }
}
