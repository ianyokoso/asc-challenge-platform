export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminUser } from '@/lib/api/admin-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/certifications/reset
 * 전체 리셋: 기준 날짜 이전 인증 기록 삭제 + 모든 참여자를 대기 상태로 전환 + 다음 기수 설정
 * 
 * Request Body:
 * - beforeDate: string (yyyy-MM-dd) - 이 날짜 이전의 인증 기록을 삭제
 * - seasonStartDate: string (yyyy-MM-dd) - 다음 기수 시작일
 * - seasonEndDate: string (yyyy-MM-dd) - 다음 기수 종료일
 * - reason?: string - 리셋 사유 (선택)
 * - trackId?: string (UUID) - 특정 트랙만 리셋 (선택, 없으면 전체 트랙)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Reset API] 🚀 Request received');

    // DEMO_MODE 우회 처리
    if (process.env.DEMO_MODE === 'true') {
      console.log('[Reset API] 🎭 DEMO_MODE enabled, skipping actual reset');
      return NextResponse.json({ ok: true, demo: true });
    }

    // 환경변수 검증
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Reset API] ❌ Missing required environment variables');
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Missing SUPABASE environment variables',
          step: 'environment_check'
        },
        { status: 500 }
      );
    }

    // 1. 관리자 인증 확인
    const adminEmail = await verifyAdminUser(request);
    console.log('[Reset API] ✅ Admin verified:', adminEmail);

    // 2. Request body 파싱
    const body = await request.json();
    const { 
      beforeDate, 
      seasonStartDate,
      seasonEndDate,
      reason = 'Full Reset', 
      trackId 
    } = body;

    if (!beforeDate) {
      return NextResponse.json(
        { error: 'beforeDate is required (yyyy-MM-dd)' },
        { status: 400 }
      );
    }

    if (!seasonStartDate || !seasonEndDate) {
      return NextResponse.json(
        { error: 'seasonStartDate and seasonEndDate are required (yyyy-MM-dd)' },
        { status: 400 }
      );
    }

    // 날짜 검증
    const startDate = new Date(seasonStartDate);
    const endDate = new Date(seasonEndDate);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'seasonStartDate must be before seasonEndDate' },
        { status: 400 }
      );
    }

    console.log('[Reset API] 📅 Reset before date:', beforeDate);
    console.log('[Reset API] 🎯 Next season:', seasonStartDate, '~', seasonEndDate);
    if (trackId) {
      console.log('[Reset API] 🎯 Target track:', trackId);
    } else {
      console.log('[Reset API] 🌐 Target: All tracks');
    }

    // 3. Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 4. 관리자 정보 조회
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (adminError || !adminUser) {
      console.error('[Reset API] ❌ Failed to get admin user:', adminError);
      return NextResponse.json(
        { error: 'Failed to get admin user information' },
        { status: 500 }
      );
    }

    console.log('[Reset API] 👤 Admin user ID:', adminUser.id);

    // 5. 트랜잭션 시작 (백업 → 삭제 → 참여자 상태 변경)
    console.log('[Reset API] 🔄 Starting reset transaction...');

    // 5-0. 백업 테이블 보장 (없으면 생성)
    console.log('[Reset API] 🔧 Ensuring backup table exists...');
    try {
      const { error: createTableError } = await supabase.rpc('create_certifications_backup_table_if_not_exists');
      if (createTableError) {
        console.error('[Reset API] ❌ Failed to create backup table:', createTableError);
        // 테이블 생성 실패 시 수동으로 시도
        const { error: manualCreateError } = await supabase
          .from('certifications_backup')
          .select('id')
          .limit(1);
        
        if (manualCreateError && manualCreateError.code === 'PGRST116') {
          console.error('[Reset API] ❌ Backup table does not exist and cannot be created');
          return NextResponse.json(
            { 
              ok: false, 
              message: 'Backup table creation failed: ' + createTableError.message,
              step: 'backup_table_creation'
            },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error('[Reset API] ❌ Error checking/creating backup table:', error);
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Failed to ensure backup table exists: ' + (error instanceof Error ? error.message : 'Unknown error'),
          step: 'backup_table_check'
        },
        { status: 500 }
      );
    }

    // 5-1. 삭제 대상 인증 기록 조회
    let certQuery = supabase
      .from('certifications')
      .select('*')
      .lt('certification_date', beforeDate);

    if (trackId) {
      certQuery = certQuery.eq('track_id', trackId);
    }

    const { data: certificationsToDelete, error: fetchError } = await certQuery;

    if (fetchError) {
      console.error('[Reset API] ❌ Failed to fetch certifications:', fetchError);
      return NextResponse.json(
        { ok: false, message: 'Failed to fetch certifications to delete: ' + fetchError.message, step: 'fetch_certifications' },
        { status: 500 }
      );
    }

    console.log('[Reset API] 📊 Certifications to delete:', certificationsToDelete?.length || 0);

    // 5-2. 백업 테이블에 복사
    if (certificationsToDelete && certificationsToDelete.length > 0) {
      console.log('[Reset API] 📦 Backing up certifications...');
      
      // 백업 레코드 생성 (명시적 컬럼 매핑)
      const backupRecords = certificationsToDelete.map(cert => ({
        id: cert.id,
        user_id: cert.user_id,
        track_id: cert.track_id,
        user_track_id: cert.user_track_id,
        certification_url: cert.certification_url,
        certification_date: cert.certification_date,
        submitted_at: cert.submitted_at,
        status: cert.status,
        notes: cert.notes,
        admin_override: cert.admin_override,
        admin_override_by: cert.admin_override_by,
        admin_override_at: cert.admin_override_at,
        created_at: cert.created_at,
        updated_at: cert.updated_at,
        backup_at: new Date().toISOString(),
        term_number: cert.term_number || 1,
        source_id: cert.id // 원본 ID를 source_id로 저장
      }));

      // 중복 방지를 위한 ON CONFLICT 처리
      const { error: backupError } = await supabase
        .from('certifications_backup')
        .upsert(backupRecords, { 
          onConflict: 'source_id',
          ignoreDuplicates: true 
        });

      if (backupError) {
        console.error('[Reset API] ❌ Backup failed:', backupError.message, backupError.details);
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Failed to backup certifications: ' + backupError.message,
            step: 'backup_insert',
            details: backupError.details
          },
          { status: 500 }
        );
      }

      console.log('[Reset API] ✅ Backup completed');

      // 5-3. 인증 기록 삭제
      console.log('[Reset API] 🗑️ Deleting original certifications...');
      let deleteQuery = supabase
        .from('certifications')
        .delete()
        .lt('certification_date', beforeDate);

      if (trackId) {
        deleteQuery = deleteQuery.eq('track_id', trackId);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('[Reset API] ❌ Delete failed:', deleteError);
        return NextResponse.json(
          { ok: false, message: 'Failed to delete certifications: ' + deleteError.message, step: 'delete_certifications' },
          { status: 500 }
        );
      }

      console.log('[Reset API] ✅ Certifications deleted');
    }

    // 5-4. 참여자 상태를 대기(is_active = false)로 변경
    console.log('[Reset API] 👥 Updating participant status...');
    let updateQuery = supabase
      .from('user_tracks')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true); // 현재 활성 상태인 참여자만

    if (trackId) {
      updateQuery = updateQuery.eq('track_id', trackId);
    }

    const { data: updatedParticipants, error: updateError } = await updateQuery.select();

    if (updateError) {
      console.error('[Reset API] ❌ Failed to update participants:', updateError);
      return NextResponse.json(
        { ok: false, message: 'Failed to update participants status: ' + updateError.message, step: 'update_participants' },
        { status: 500 }
      );
    }

    console.log('[Reset API] ✅ Participants status updated:', updatedParticipants?.length || 0);

    // 5-5. 새로운 기수 생성
    console.log('[Reset API] 📅 Creating new period...');
    // 가장 최근 기수 번호 조회
    const { data: latestPeriod } = await supabase
      .from('periods')
      .select('term_number')
      .order('term_number', { ascending: false })
      .limit(1)
      .single();

    const nextTermNumber = (latestPeriod?.term_number || 0) + 1;

    // 기존 활성 기수 비활성화
    await supabase
      .from('periods')
      .update({ is_active: false })
      .eq('is_active', true);

    // 새로운 기수 생성
    const { data: newPeriod, error: periodError } = await supabase
      .from('periods')
      .insert({
        term_number: nextTermNumber,
        start_date: seasonStartDate,
        end_date: seasonEndDate,
        is_active: true,
        description: reason || `${nextTermNumber}기 챌린지`,
        created_by: adminUser.id,
      })
      .select()
      .single();

    if (periodError) {
      console.error('[Reset API] ❌ Failed to create new period:', periodError);
      // 기수 생성 실패는 치명적이지 않으므로 경고만 기록
      console.warn('[Reset API] ⚠️ Continuing without period creation:', periodError.message);
    } else {
      console.log('[Reset API] ✅ New period created:', newPeriod?.id, `(${nextTermNumber}기)`);
    }

    // 6. 성공 응답
    console.log('[Reset API] ✅ Reset completed successfully');
    console.log('[Reset API] 📊 Results:', {
      certificationsBackedUp: certificationsToDelete?.length || 0,
      participantsUpdated: updatedParticipants?.length || 0,
      nextSeason: `${seasonStartDate} ~ ${seasonEndDate}`,
    });

    return NextResponse.json({
      ok: true,
      backedUp: certificationsToDelete?.length || 0,
      data: {
        certificationsDeleted: certificationsToDelete?.length || 0,
        participantsUpdated: updatedParticipants?.length || 0,
        beforeDate,
        seasonStartDate,
        seasonEndDate,
        trackId: trackId || 'all',
        reason,
        backupCompleted: (certificationsToDelete?.length || 0) > 0,
        newPeriod: newPeriod ? {
          id: newPeriod.id,
          termNumber: newPeriod.term_number,
          startDate: newPeriod.start_date,
          endDate: newPeriod.end_date,
        } : null,
      }
    });

  } catch (error) {
    console.error('[Reset API] ❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        ok: false,
        message: 'Internal server error: ' + errorMessage,
        step: 'unexpected_error'
      },
      { status: 500 }
    );
  }
}

