import { NextRequest, NextResponse } from "next/server";
import { createClientWithSession } from "@/lib/supabase/server";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 API AUTH SESSION: Request received');
    console.log('🔍 API AUTH SESSION: Cookies:', req.cookies.getAll().map(c => c.name));
    
    // Utiliser le client serveur qui lit les cookies
    const supabase = await createClientWithSession();
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('🔍 API AUTH SESSION: Session result:', { hasSession: !!session, error: !!error });
    
    if (error) {
      console.error('❌ API AUTH SESSION: Error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 401 });
    }
    
    if (!session) {
      console.log('❌ API AUTH SESSION: No session found');
      return NextResponse.json({ 
        success: false, 
        error: 'No session found' 
      }, { status: 401 });
    }
    
    console.log('✅ API AUTH SESSION: Session found for user:', session.user.id);
    
    return NextResponse.json({
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
  } catch (error) {
    console.error('❌ API AUTH SESSION: Exception:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
