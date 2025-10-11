/**
 * API Route: 관리자 권한 확인
 * 
 * @route GET /api/admin/check
 * @returns {{ isAdmin: boolean, userId: string | null }}
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Create Supabase server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { isAdmin: false, userId: null, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check admin status using RPC function
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      check_user_id: user.id,
    });

    if (adminError) {
      console.error('[Admin Check API] Error checking admin status:', adminError);
      return NextResponse.json(
        { isAdmin: false, userId: user.id, error: adminError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isAdmin: isAdmin || false,
      userId: user.id,
    });
  } catch (error: any) {
    console.error('[Admin Check API] Unexpected error:', error);
    return NextResponse.json(
      { isAdmin: false, userId: null, error: error.message },
      { status: 500 }
    );
  }
}

