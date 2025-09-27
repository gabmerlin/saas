import { NextRequest, NextResponse } from "next/server";
import { createClientWithSession } from "@/lib/supabase/server";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 API AUTH SESSION: Request received');
    console.log('🔍 API AUTH SESSION: Origin:', req.headers.get('origin'));
    console.log('🔍 API AUTH SESSION: Host:', req.headers.get('host'));
    console.log('🔍 API AUTH SESSION: Cookies:', req.cookies.getAll().map(c => c.name));
    
    // Utiliser le client serveur qui lit les cookies
    const supabase = await createClientWithSession();
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 API AUTH SESSION: Session result:', { hasSession: !!session, error: !!error });
    
    if (error) {
      console.error('❌ API AUTH SESSION: Error:', error);
      const response = NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 401 });
      
      // Ajouter les headers CORS
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    }
    
    if (!session) {
      console.log('❌ API AUTH SESSION: No session found');
      const response = NextResponse.json({ 
        success: false, 
        error: 'No session found' 
      }, { status: 401 });
      
      // Ajouter les headers CORS
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    }
    
    console.log('✅ API AUTH SESSION: Session found for user:', session.user.id);
    
    const response = NextResponse.json({
      success: true,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: {
          id: session.user.id,
          email: session.user.email
        }
      }
    });
    
    // Ajouter les headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error) {
    console.error('❌ API AUTH SESSION: Exception:', error);
    const response = NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
    // Ajouter les headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  }
}

// Gérer les requêtes OPTIONS pour CORS
export async function OPTIONS(req: NextRequest) {
  console.log('🔍 API AUTH SESSION: OPTIONS request received');
  
  const response = new NextResponse(null, { status: 200 });
  
  // Ajouter les headers CORS
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}
