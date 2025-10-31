import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 공통 인증 데이터 조회 API
 * 
 * Query Parameters:
 * - userId: 특정 사용자의 인증 조회
 * - periodId: 특정 기수의 인증 조회
 * - trackId: 특정 트랙의 인증 조회
 * - status: 상태 필터 (submitted, approved, rejected)
 * - limit: 결과 제한
 * - offset: 페이지네이션 오프셋
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = req.nextUrl;

  const userId = searchParams.get('userId');
  const periodId = searchParams.get('periodId');
  const trackId = searchParams.get('trackId');
  const status = searchParams.get('status');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  console.log('[API /certifications] 🔍 GET request:', {
    userId,
    periodId,
    trackId,
    status,
    limit,
    offset,
  });

  try {
    const supabase = await createClient();

    // 쿼리 빌드
    let query = supabase
      .from('certifications')
      .select('*', { count: 'exact' });

    if (userId) query = query.eq('user_id', userId);
    if (periodId) query = query.eq('period_id', periodId);
    if (trackId) query = query.eq('track_id', trackId);
    if (status) query = query.eq('status', status);

    // 정렬: 최신순
    query = query.order('certification_date', { ascending: false });
    query = query.order('created_at', { ascending: false });

    // 페이지네이션
    if (limit) {
      const limitNum = parseInt(limit, 10);
      const offsetNum = offset ? parseInt(offset, 10) : 0;
      query = query.range(offsetNum, offsetNum + limitNum - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[API /certifications] ❌ Query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log('[API /certifications] ✅ Success:', {
      count: data?.length || 0,
      totalCount: count,
      durationMs: duration,
    });

    return NextResponse.json({
      ok: true,
      data: data || [],
      count: count ?? 0,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[API /certifications] ❌ Unexpected error:', {
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

