import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/tenants";

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[TEST-DB] Test de connexion à la base de données');
    
    const dbClient = getServiceClient();
    
    // Test simple de connexion
    const { data, error } = await dbClient
      .from('tenants')
      .select('count')
      .limit(1);

    if (error) {
      console.error('[TEST-DB] Erreur de connexion:', error);
      return NextResponse.json({
        ok: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    console.log('[TEST-DB] Connexion réussie');
    
    return NextResponse.json({
      ok: true,
      message: "Connexion à la base de données réussie",
      data: data
    });

  } catch (error) {
    console.error('[TEST-DB] Erreur inattendue:', error);
    return NextResponse.json({
      ok: false,
      error: "Erreur inattendue",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
