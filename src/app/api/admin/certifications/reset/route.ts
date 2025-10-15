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
      reason = 'Admin Reset'
    } = body;

    console.log('[Reset API] 📋 Reset parameters:', { termNumber, since, reason });

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
          p_term_number: termNumber || null,
          p_since: since || null
        }
      );

      if (rpcError) {
        console.warn('[Reset API] ⚠️ RPC failed, falling back to step-by-step:', rpcError.message);
        throw new Error('RPC not available');
      }

      console.log('[Reset API] ✅ RPC completed successfully:', rpcResult);
      return NextResponse.json(rpcResult);

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
      
      if (termNumber) {
        certQuery = certQuery.eq('term_number', termNumber);
      }
      
      if (since) {
        certQuery = certQuery.gte('certification_date', since);
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
      
      if (termNumber) {
        deleteQuery = deleteQuery.eq('term_number', termNumber);
      }
      
      if (since) {
        deleteQuery = deleteQuery.gte('certification_date', since);
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

    // 6. 성공 응답 (폴백 모드)
    console.log('[Reset API] ✅ Fallback reset completed successfully');

    console.log('[Reset API] 📊 Results:', {
      backedUp: backupCount,
      deleted: deleteCount,
    });

    return NextResponse.json({
      ok: true,
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

