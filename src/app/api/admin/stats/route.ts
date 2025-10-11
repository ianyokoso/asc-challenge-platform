/**
 * API Route: 관리자 전용 - 통계 정보 조회
 * 
 * @route GET /api/admin/stats
 * @description 전체 사용자, 오늘의 인증, 탈락 후보자 통계를 조회합니다. (관리자 전용)
 * @returns {{ stats: AdminStats }}
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
        { error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      );
    }

    // Check admin status using RPC function (protected by RLS)
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      check_user_id: user.id,
    });

    if (adminError || !isAdmin) {
      console.error('[Admin Stats API] Access denied:', { userId: user.id, isAdmin, adminError });
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Fetch admin statistics
    // 1. Total active users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 2. Today's certifications
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCertifications } = await supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('certification_date', today);

    // 3. Dropout candidates (users with warnings)
    const { count: dropoutCandidates } = await supabase
      .from('user_tracks')
      .select('*', { count: 'exact', head: true })
      .gt('dropout_warnings', 0)
      .eq('is_active', true);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        todayCertifications: todayCertifications || 0,
        dropoutCandidates: dropoutCandidates || 0,
      },
    });
  } catch (error: any) {
    console.error('[Admin Stats API] Unexpected error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
