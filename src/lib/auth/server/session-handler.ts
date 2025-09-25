/**
 * Gestionnaire de session côté serveur
 */
import { createClient } from './supabase-server-client';

export async function createClientWithSession() {
  const supabase = createClient();
  
  // Pour l'instant, retourner simplement le client
  // La gestion des cookies sera implémentée dans les API routes
  return supabase;
}
