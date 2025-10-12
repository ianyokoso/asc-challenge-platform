import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminUser } from '@/lib/api/admin-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/certifications/bulk-delete
 * 기준 날짜 이전의 모든 인증 기록을 백업 후 삭제
 * 
 * Request Body:
 * - beforeDate: string (yyyy-MM-dd) - 이 날짜 이전의 기록을 삭제
 * - reason?: string - 삭제 사유 (선택)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Bulk Delete API] 🚀 Request received');

    // 1. 관리자 인증 확인
    const adminEmail = await verifyAdminUser(request);
    console.log('[Bulk Delete API] ✅ Admin verified:', adminEmail);

    // 2. Request body 파싱
    const body = await request.json();
    const { beforeDate, reason } = body;

    if (!beforeDate) {
      return NextResponse.json(
        { error: 'beforeDate is required (format: yyyy-MM-dd)' },
        { status: 400 }
      );
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(beforeDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use yyyy-MM-dd' },
        { status: 400 }
      );
    }

    console.log('[Bulk Delete API] 📅 Target date:', beforeDate);

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
      console.error('[Bulk Delete API] ❌ Admin user not found:', adminError);
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // 5. 삭제 대상 인증 기록 조회
    const { data: targetCerts, error: fetchError } = await supabase
      .from('certifications')
      .select('*')
      .lt('certification_date', beforeDate);

    if (fetchError) {
      console.error('[Bulk Delete API] ❌ Error fetching certifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch certifications', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!targetCerts || targetCerts.length === 0) {
      console.log('[Bulk Delete API] ℹ️ No certifications to delete');
      return NextResponse.json({
        success: true,
        message: 'No certifications found to delete',
        deletedCount: 0,
      });
    }

    console.log('[Bulk Delete API] 📊 Found', targetCerts.length, 'certifications to delete');

    // 6. 백업 테이블에 복사
    const backupRecords = targetCerts.map(cert => ({
      ...cert,
      backed_up_at: new Date().toISOString(),
      backed_up_by: adminUser.id,
      backup_reason: reason || `bulk_delete_before_${beforeDate}`,
      original_deleted_at: new Date().toISOString(),
    }));

    const { error: backupError } = await supabase
      .from('certifications_backup')
      .insert(backupRecords);

    if (backupError) {
      console.error('[Bulk Delete API] ❌ Error backing up certifications:', backupError);
      return NextResponse.json(
        { error: 'Failed to backup certifications', details: backupError.message },
        { status: 500 }
      );
    }

    console.log('[Bulk Delete API] ✅ Backup completed');

    // 7. 원본 테이블에서 삭제
    const { error: deleteError } = await supabase
      .from('certifications')
      .delete()
      .lt('certification_date', beforeDate);

    if (deleteError) {
      console.error('[Bulk Delete API] ❌ Error deleting certifications:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete certifications', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[Bulk Delete API] ✅ Delete completed');

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${targetCerts.length} certification(s) before ${beforeDate}`,
      deletedCount: targetCerts.length,
      beforeDate,
      backedUp: true,
    });

  } catch (error) {
    console.error('[Bulk Delete API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

