import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminUser } from '@/lib/api/admin-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/certifications/delete
 * 특정 인증 기록을 백업 후 삭제
 * 
 * Request Body:
 * - certificationId?: string (UUID) - 인증 ID로 삭제
 * - userId?: string (UUID) - 특정 유저의 특정 날짜 인증 삭제
 * - trackId?: string (UUID) - 특정 트랙의 특정 날짜 인증 삭제
 * - date?: string (yyyy-MM-dd) - 특정 날짜의 인증 삭제
 * - reason?: string - 삭제 사유 (선택)
 * 
 * 옵션:
 * 1. certificationId만 제공 → 해당 ID의 인증 삭제
 * 2. userId + trackId + date 제공 → 특정 유저/트랙/날짜의 인증 삭제
 * 3. userId + date 제공 → 특정 유저의 특정 날짜 모든 인증 삭제
 * 4. trackId + date 제공 → 특정 트랙의 특정 날짜 모든 인증 삭제
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Delete API] 🚀 Request received');

    // 1. 관리자 인증 확인
    const adminEmail = await verifyAdminUser(request);
    console.log('[Delete API] ✅ Admin verified:', adminEmail);

    // 2. Request body 파싱
    const body = await request.json();
    const { certificationId, userId, trackId, date, reason } = body;

    if (!certificationId && !date) {
      return NextResponse.json(
        { error: 'Either certificationId or date must be provided' },
        { status: 400 }
      );
    }

    // 날짜 형식 검증
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use yyyy-MM-dd' },
          { status: 400 }
        );
      }
    }

    console.log('[Delete API] 🎯 Target:', { certificationId, userId, trackId, date });

    // 3. Service Role로 Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 4. 관리자 user_id 가져오기
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (adminError || !adminUser) {
      console.error('[Delete API] ❌ Admin user not found:', adminError);
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // 5. 삭제 대상 쿼리 빌드
    let query = supabase.from('certifications').select('*');

    if (certificationId) {
      query = query.eq('id', certificationId);
    } else {
      if (userId) query = query.eq('user_id', userId);
      if (trackId) query = query.eq('track_id', trackId);
      if (date) query = query.eq('certification_date', date);
    }

    // 6. 삭제 대상 인증 기록 조회
    const { data: targetCerts, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Delete API] ❌ Error fetching certifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch certifications', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!targetCerts || targetCerts.length === 0) {
      console.log('[Delete API] ℹ️ No certifications found');
      return NextResponse.json({
        success: true,
        message: 'No certifications found to delete',
        deletedCount: 0,
      });
    }

    console.log('[Delete API] 📊 Found', targetCerts.length, 'certification(s) to delete');

    // 7. 백업 테이블에 복사
    const backupRecords = targetCerts.map(cert => ({
      ...cert,
      backed_up_at: new Date().toISOString(),
      backed_up_by: adminUser.id,
      backup_reason: reason || 'individual_delete',
      original_deleted_at: new Date().toISOString(),
    }));

    const { error: backupError } = await supabase
      .from('certifications_backup')
      .insert(backupRecords);

    if (backupError) {
      console.error('[Delete API] ❌ Error backing up certifications:', backupError);
      return NextResponse.json(
        { error: 'Failed to backup certifications', details: backupError.message },
        { status: 500 }
      );
    }

    console.log('[Delete API] ✅ Backup completed');

    // 8. 원본 테이블에서 삭제
    let deleteQuery = supabase.from('certifications').delete();

    if (certificationId) {
      deleteQuery = deleteQuery.eq('id', certificationId);
    } else {
      if (userId) deleteQuery = deleteQuery.eq('user_id', userId);
      if (trackId) deleteQuery = deleteQuery.eq('track_id', trackId);
      if (date) deleteQuery = deleteQuery.eq('certification_date', date);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error('[Delete API] ❌ Error deleting certifications:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete certifications', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[Delete API] ✅ Delete completed');

    // 9. 성공 응답
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${targetCerts.length} certification(s)`,
      deletedCount: targetCerts.length,
      deletedCertifications: targetCerts.map(c => ({
        id: c.id,
        userId: c.user_id,
        trackId: c.track_id,
        date: c.certification_date,
      })),
      backedUp: true,
    });

  } catch (error) {
    console.error('[Delete API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

