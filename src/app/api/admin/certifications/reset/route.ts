export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminUser } from '@/lib/api/admin-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/certifications/reset
 * 인증 기록 리셋: 백업 후 삭제
 * 
 * Request Body:
 * - termNumber?: number - 특정 기수만 리셋
 * - since?: string (yyyy-MM-dd) - 이 날짜 이후의 인증 기록을 리셋
 * - reason?: string - 리셋 사유 (선택)
 * 
 * 우선 RPC 함수를 사용하고, 없으면 폴백 로직으로 처리
 */
export async function POST(request: NextRequest) {
  const step = 'init';
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
          message: 'Missing service role key',
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
      termNumber, 
      since,
      beforeDate,  // 프론트엔드에서 보내는 파라미터
      seasonStartDate,
      seasonEndDate,
      reason = 'Admin Reset'
    } = body;

    console.log('[Reset API] 📋 Reset parameters:', { termNumber, since, beforeDate, seasonStartDate, seasonEndDate, reason });

    // 프론트엔드 파라미터를 RPC 함수 파라미터로 변환
    const rpcTermNumber = termNumber || null;
    const rpcSince = beforeDate || since || null;

    // 3. Supabase 클라이언트 생성 (SERVICE_ROLE_KEY 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    // 4. RPC 함수 우선 시도
    console.log('[Reset API] 🔄 Attempting RPC function...');
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'admin_reset_certifications', 
        { 
          p_term_number: rpcTermNumber,
          p_since: rpcSince
        }
      );

      if (rpcError) {
        console.warn('[Reset API] ⚠️ RPC failed, falling back to step-by-step:', rpcError.message);
        throw new Error('RPC not available');
      }

      console.log('[Reset API] ✅ RPC completed successfully:', rpcResult);
      
      // 사용자 상태를 대기로 변경 (전체 리셋의 경우)
      let participantsUpdated = 0;
      try {
        console.log('[Reset API] 🔄 Updating user status to inactive...');
        
        const { data: updateResult, error: updateError } = await supabase
          .from('users')
          .update({ is_active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000'); // 시스템 계정 제외
        
        if (updateError) {
          console.error('[Reset API] ❌ Failed to update user status:', updateError);
        } else {
          console.log('[Reset API] ✅ User status updated to inactive');
          // 실제 업데이트된 행 수를 가져오기 어려우므로 추정값 사용
          participantsUpdated = 1; // RPC 모드에서도 정확한 수를 알기 어려움
        }
      } catch (error) {
        console.error('[Reset API] ❌ Error updating user status:', error);
      }

      // 기수 생성 로직 추가 (seasonStartDate와 seasonEndDate가 있는 경우)
      if (seasonStartDate && seasonEndDate) {
        try {
          console.log('[Reset API] 🔄 Creating new period...');
          
          // 기수 번호 계산 (기존 기수 + 1)
          const { data: lastPeriod } = await supabase
            .from('periods')
            .select('term_number')
            .order('term_number', { ascending: false })
            .limit(1);
          
          const nextTermNumber = (lastPeriod?.[0]?.term_number || 0) + 1;
          
          // 새 기수 생성
          const { data: newPeriod, error: periodError } = await supabase
            .from('periods')
            .insert({
              term_number: nextTermNumber,
              start_date: seasonStartDate,
              end_date: seasonEndDate,
              description: `전체 리셋으로 생성된 ${nextTermNumber}기`,
              is_active: true
            })
            .select()
            .single();
          
          if (periodError) {
            console.error('[Reset API] ❌ Failed to create new period:', periodError);
            // 기수 생성 실패해도 리셋은 성공으로 처리
          } else {
            console.log('[Reset API] ✅ New period created:', newPeriod);
            rpcResult.newPeriod = newPeriod;
          }
        } catch (error) {
          console.error('[Reset API] ❌ Error creating new period:', error);
          // 기수 생성 실패해도 리셋은 성공으로 처리
        }
      }
      
      return NextResponse.json({
        ok: true,
        data: {
          ...rpcResult,
          participantsUpdated
        }
      });

    } catch (rpcError) {
      console.log('[Reset API] 🔄 RPC failed, using fallback approach');
    }

    // 5. 폴백: 단계별 처리
    console.log('[Reset API] 🔄 Starting fallback reset process...');

    // 5-0. 백업 테이블 보장
    const step_ensure_table = 'ensure_table';
    try {
      console.log('[Reset API] 🔧 Ensuring backup table exists...');
      
      // 테이블 존재 확인
      const { error: checkError } = await supabase
        .from('certifications_backup')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === 'PGRST116') {
        console.error('[Reset API] ❌ Backup table does not exist');
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Backup table does not exist: ' + checkError.message,
            step: step_ensure_table,
            details: checkError.details
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('[Reset API] ❌ Error checking backup table:', error);
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Failed to check backup table: ' + (error instanceof Error ? error.message : 'Unknown error'),
          step: step_ensure_table
        },
        { status: 500 }
      );
    }

    // 5-1. 삭제 대상 인증 기록 조회
    const step_fetch = 'fetch_certifications';
    let certificationsToDelete;
    try {
      console.log('[Reset API] 📊 Fetching certifications to reset...');
      
      let certQuery = supabase.from('certifications').select('*');
      
      if (rpcTermNumber) {
        certQuery = certQuery.eq('term_number', rpcTermNumber);
      }
      
      if (rpcSince) {
        certQuery = certQuery.gte('certification_date', rpcSince);
      }

      const { data, error: fetchError } = await certQuery;

      if (fetchError) {
        console.error('[Reset API] ❌ Failed to fetch certifications:', fetchError);
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Failed to fetch certifications: ' + fetchError.message,
            step: step_fetch,
            details: fetchError.details
          },
          { status: 500 }
        );
      }

      certificationsToDelete = data;
      console.log('[Reset API] 📊 Certifications to reset:', certificationsToDelete?.length || 0);
      
    } catch (error) {
      console.error('[Reset API] ❌ Error fetching certifications:', error);
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Error fetching certifications: ' + (error instanceof Error ? error.message : 'Unknown error'),
          step: step_fetch
        },
        { status: 500 }
      );
    }

    // 5-2. 백업 테이블에 복사
    const step_backup = 'backup';
    let backupCount = 0;
    let deleteCount = 0;
    
    if (certificationsToDelete && certificationsToDelete.length > 0) {
      try {
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
              step: step_backup,
              details: backupError.details
            },
            { status: 500 }
          );
        }

        backupCount = certificationsToDelete.length;
        console.log('[Reset API] ✅ Backup completed:', backupCount, 'records');
        
      } catch (error) {
        console.error('[Reset API] ❌ Error during backup:', error);
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Error during backup: ' + (error instanceof Error ? error.message : 'Unknown error'),
            step: step_backup
          },
          { status: 500 }
        );
      }

    // 5-3. 인증 기록 삭제
    const step_delete = 'delete';
    
    try {
      console.log('[Reset API] 🗑️ Deleting original certifications...');
      
      let deleteQuery = supabase.from('certifications').delete();
      
      if (rpcTermNumber) {
        deleteQuery = deleteQuery.eq('term_number', rpcTermNumber);
      }
      
      if (rpcSince) {
        deleteQuery = deleteQuery.gte('certification_date', rpcSince);
      }

      const { error: deleteError, count: deletedCount } = await deleteQuery;

      if (deleteError) {
        console.error('[Reset API] ❌ Delete failed:', deleteError);
        return NextResponse.json(
          { 
            ok: false, 
            message: 'Failed to delete certifications: ' + deleteError.message,
            step: step_delete,
            details: deleteError.details
          },
          { status: 500 }
        );
      }

      // 실제 삭제된 행 수 또는 백업된 행 수 사용
      deleteCount = deletedCount || certificationsToDelete?.length || 0;
      console.log('[Reset API] ✅ Certifications deleted:', deleteCount, 'records');
      
    } catch (error) {
      console.error('[Reset API] ❌ Error during delete:', error);
      return NextResponse.json(
        { 
          ok: false, 
          message: 'Error during delete: ' + (error instanceof Error ? error.message : 'Unknown error'),
          step: step_delete
        },
        { status: 500 }
      );
    }
    }

    // 6. 사용자 상태를 대기로 변경 (전체 리셋의 경우)
    let participantsUpdated = 0;
    try {
      console.log('[Reset API] 🔄 Updating user status to inactive...');
      
      const { data: updateResult, error: updateError } = await supabase
        .from('users')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 시스템 계정 제외
      
      if (updateError) {
        console.error('[Reset API] ❌ Failed to update user status:', updateError);
      } else {
        console.log('[Reset API] ✅ User status updated to inactive');
        // 실제 업데이트된 행 수를 가져오기 어려우므로 추정값 사용
        participantsUpdated = 1; // 폴백 모드에서는 정확한 수를 알기 어려움
      }
    } catch (error) {
      console.error('[Reset API] ❌ Error updating user status:', error);
    }

    // 7. 기수 생성 로직 (폴백 모드)
    let newPeriod = null;
    if (seasonStartDate && seasonEndDate) {
      try {
        console.log('[Reset API] 🔄 Creating new period (fallback mode)...');
        
        // 기수 번호 계산 (기존 기수 + 1)
        const { data: lastPeriod } = await supabase
          .from('periods')
          .select('term_number')
          .order('term_number', { ascending: false })
          .limit(1);
        
        const nextTermNumber = (lastPeriod?.[0]?.term_number || 0) + 1;
        
        // 새 기수 생성
        const { data: periodData, error: periodError } = await supabase
          .from('periods')
          .insert({
            term_number: nextTermNumber,
            start_date: seasonStartDate,
            end_date: seasonEndDate,
            description: `전체 리셋으로 생성된 ${nextTermNumber}기`,
            is_active: true
          })
          .select()
          .single();
        
        if (periodError) {
          console.error('[Reset API] ❌ Failed to create new period:', periodError);
        } else {
          console.log('[Reset API] ✅ New period created:', periodData);
          newPeriod = periodData;
        }
      } catch (error) {
        console.error('[Reset API] ❌ Error creating new period:', error);
      }
    }

    // 8. 성공 응답 (폴백 모드)
    console.log('[Reset API] ✅ Fallback reset completed successfully');

    console.log('[Reset API] 📊 Results:', {
      backedUp: backupCount,
      deleted: deleteCount,
      participantsUpdated,
      newPeriod
    });

    return NextResponse.json({
      ok: true,
      data: {
        certificationsDeleted: deleteCount,
        participantsUpdated,
        newPeriod
      },
      backedUp: backupCount,
      deleted: deleteCount,
      mode: 'fallback'
    });

  } catch (error) {
    console.error('[Reset API] ❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        ok: false,
        message: 'Internal server error: ' + errorMessage,
        step: step || 'unexpected_error'
      },
      { status: 500 }
    );
  }
}

