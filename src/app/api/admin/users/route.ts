/**
 * API Route: 관리자 전용 - 사용자 목록 조회
 * 
 * @route GET /api/admin/users
 * @description 모든 사용자와 트랙 정보를 조회합니다. (관리자 전용)
 * @returns {{ users: UserWithTracks[] }}
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    
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
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // Check admin status using RPC function (protected by RLS)
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      check_user_id: user.id,
    });

    if (adminError || !isAdmin) {
      console.error('[Admin Users API] Access denied:', { userId: user.id, isAdmin, adminError });
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all users with tracks (RLS automatically filters based on admin status)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        user_tracks(
          id,
          track_id,
          is_active,
          dropout_warnings,
          track:tracks(*)
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('[Admin Users API] Error fetching users:', usersError);
      return NextResponse.json(
        { error: `Database error: ${usersError.message}` },
        { status: 500 }
      );
    }

    // Filter to only show active tracks
    const usersWithActiveTracks = (users || []).map(user => ({
      ...user,
      user_tracks: user.user_tracks?.filter((ut: any) => ut.is_active) || [],
    }));

    return NextResponse.json({
      users: usersWithActiveTracks,
      count: usersWithActiveTracks.length,
    });
  } catch (error: any) {
    console.error('[Admin Users API] Unexpected error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

