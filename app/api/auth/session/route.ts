import { NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase/client";

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Cette route sera appelée côté client pour récupérer la session
    const { data: { session }, error } = await supabaseBrowser().auth.getSession();
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session found' 
      }, { status: 401 });
    }
    
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
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
