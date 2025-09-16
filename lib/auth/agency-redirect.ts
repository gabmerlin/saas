import { supabaseBrowser } from '@/lib/supabase/client';

export interface AgencyInfo {
  id: string;
  name: string;
  subdomain: string;
  locale: string;
  url: string;
}

export interface AgencyCheckResult {
  hasExistingAgency: boolean;
  agency?: AgencyInfo;
}

/**
 * Vérifie si l'utilisateur connecté a une agence existante
 */
export async function checkExistingAgency(): Promise<AgencyCheckResult> {
  try {
    const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
    
    if (sessionError || !session) {
      return { hasExistingAgency: false };
    }
    
    const authToken = session.access_token;
    
    const response = await fetch("/api/auth/check-existing-agency", {
      method: "GET",
      headers: { 
        "authorization": `Bearer ${authToken}`,
        "x-session-token": authToken
      }
    });
    
    const result = await response.json();
    
    if (result.ok && result.hasExistingAgency) {
      return {
        hasExistingAgency: true,
        agency: result.agency
      };
    }
    
    return { hasExistingAgency: false };
  } catch (error) {
    console.error("Erreur lors de la vérification d'agence existante:", error);
    return { hasExistingAgency: false };
  }
}

/**
 * Redirige l'utilisateur vers son agence existante ou vers la page par défaut
 */
export async function redirectAfterLogin(defaultRedirect: string = '/fr'): Promise<string> {
  const agencyCheck = await checkExistingAgency();
  
  if (agencyCheck.hasExistingAgency && agencyCheck.agency?.url) {
    console.log("Agence existante trouvée, redirection directe vers le subdomain");
    return agencyCheck.agency.url;
  }
  
  console.log("Aucune agence existante, redirection vers:", defaultRedirect);
  return defaultRedirect;
}
