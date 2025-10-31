import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 대시보드 집계 API
 * 
 * certifications_by_track_v 뷰를 사용하여
 * 트랙별 인증 통계를 반환
 */
export async function GET() {
  const startTime = Date.now();

  console.log('[API /certifications/dashboard] 🔍 Fetching dashboard stats');

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('certifications_by_track_v')
      .select('*')
      .order('track_name', { ascending: true });

    if (error) {
      console.error('[API /certifications/dashboard] ❌ Query error:', {
        message: error.message,
        details: error.details,
      });
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log('[API /certifications/dashboard] ✅ Success:', {
      tracksCount: data?.length || 0,
      durationMs: duration,
    });

    return NextResponse.json({
      ok: true,
      data: data || [],
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[API /certifications/dashboard] ❌ Unexpected error:', {
      error,
      durationMs: duration,
    });

    return NextResponse.json(
      { 
        ok: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

