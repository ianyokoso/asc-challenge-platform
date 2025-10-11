import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/admin-guard';
import { getAdminStats } from '@/lib/supabase/admin';

/**
 * 관리자 통계 API
 * GET /api/admin/stats
 * 
 * @permission Admin only
 * @returns 전체 사용자, 오늘 인증, 탈락 후보 통계
 */
export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const adminCheck = await withAdminAuth(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck; // 권한 없음 - 에러 응답 반환
  }
  
  try {
    // 관리자 통계 가져오기
    const stats = await getAdminStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[GET /api/admin/stats] Error:', error);
    
    return NextResponse.json(
      {
        error: '통계 조회 실패',
        code: 'STATS_ERROR',
        message: error.message || '통계를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

