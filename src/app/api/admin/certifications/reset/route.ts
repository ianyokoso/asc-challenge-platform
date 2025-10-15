export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * 관리자 전용 인증 기록 리셋 API
 * - 완전 격리: 로그인/세션과 무관한 서버 전용 처리
 * - Service Role 전용: 브라우저 클라이언트 사용 금지
 * - 원자적 백업/삭제: RPC 우선, 폴백 지원
 * - 상세 에러 반환: step별 원인 파악 가능
 */

export async function POST(request: NextRequest) {
  const requestId = Date.now() + Math.random().toString(36).substr(2, 9);
  const step = 'init';
  
  try {
    console.log(`[Reset API ${requestId}] 🚀 Request received`);

    // 1. DEMO_MODE 우회
    if (process.env.DEMO_MODE === 'true') {
      console.log(`[Reset API ${requestId}] 🎭 DEMO_MODE enabled, skipping reset`);
      return NextResponse.json({ 
        ok: true, 
        demo: true, 
        mode: 'demo',
        requestId 
      });
    }

    // 2. 환경변수 검증
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const error = { 
        ok: false, 
        step: 'init', 
        message: 'Missing service role key',
        requestId 
      };
      console.error(`[Reset API ${requestId}] ❌`, error);
      return NextResponse.json(error, { status: 500 });
    }

    // 3. Service Role 전용 클라이언트 생성 (완전 격리)
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        persistSession: false, 
        autoRefreshToken: false 
      },
    });

    // 4. Request body 파싱
    let body: { termNumber?: number; since?: string } = {};
    try {
      body = await request.json();
    } catch (error) {
      const errorResponse = { 
        ok: false, 
        step: 'init', 
        message: 'Invalid JSON body',
        requestId 
      };
      console.error(`[Reset API ${requestId}] ❌`, errorResponse);
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { termNumber, since } = body;
    console.log(`[Reset API ${requestId}] 📋 Parameters:`, { termNumber, since });

    // 5. 백업 테이블 존재 확인
    const step_ensure_table = 'ensure_table';
    try {
      console.log(`[Reset API ${requestId}] 🔧 Checking backup table...`);
      
      // 백업 테이블 존재 확인 (간단한 쿼리로)
      try {
        await admin.from('certifications_backup').select('id').limit(1);
        console.log(`[Reset API ${requestId}] ✅ Backup table exists`);
      } catch (tableError) {
        console.log(`[Reset API ${requestId}] ⚠️ Backup table may not exist, but continuing...`);
        // 테이블이 없어도 계속 진행 (백업 시도 시 에러로 처리됨)
      }
      
    } catch (error) {
      const errorResponse = { 
        ok: false, 
        step: step_ensure_table, 
        message: 'Failed to check backup table: ' + (error instanceof Error ? error.message : 'Unknown error'),
        requestId 
      };
      console.error(`[Reset API ${requestId}] ❌`, errorResponse);
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // 6. RPC 함수 우선 시도
    const step_rpc = 'rpc';
    try {
      console.log(`[Reset API ${requestId}] 🔄 Attempting RPC function...`);
      
      const { data: rpcResult, error: rpcError } = await admin.rpc(
        'admin_reset_certifications', 
        { 
          p_term_number: termNumber || null,
          p_since: since || null
        }
      );

      if (rpcError) {
        console.warn(`[Reset API ${requestId}] ⚠️ RPC failed:`, rpcError.message);
        throw new Error(`RPC failed: ${rpcError.message}`);
      }

      console.log(`[Reset API ${requestId}] ✅ RPC completed successfully:`, rpcResult);
      
      return NextResponse.json({
        ok: true,
        backedUp: rpcResult?.backedUp || 0,
        deleted: rpcResult?.deleted || 0,
        mode: 'rpc',
        requestId
      });

    } catch (rpcError) {
      console.log(`[Reset API ${requestId}] 🔄 RPC failed, using fallback approach:`, rpcError);
    }

    // 7. 폴백: 단계별 처리
    console.log(`[Reset API ${requestId}] 🔄 Starting fallback reset process...`);

    // 7-1. 삭제 대상 인증 기록 조회
    const step_fetch = 'fetch_certifications';
    let certificationsToDelete;
    try {
      console.log(`[Reset API ${requestId}] 📊 Fetching certifications to reset...`);
      
      let certQuery = admin.from('certifications').select('*');
      
      if (termNumber) {
        certQuery = certQuery.eq('term_number', termNumber);
      }
      
      if (since) {
        certQuery = certQuery.gte('certification_date', since);
      }

      const { data, error: fetchError } = await certQuery;

      if (fetchError) {
        const errorResponse = { 
          ok: false, 
          step: step_fetch, 
          message: 'Failed to fetch certifications: ' + fetchError.message,
          requestId 
        };
        console.error(`[Reset API ${requestId}] ❌`, errorResponse);
        return NextResponse.json(errorResponse, { status: 500 });
      }

      certificationsToDelete = data;
      console.log(`[Reset API ${requestId}] 📊 Certifications to reset:`, certificationsToDelete?.length || 0);
      
    } catch (error) {
      const errorResponse = { 
        ok: false, 
        step: step_fetch, 
        message: 'Error fetching certifications: ' + (error instanceof Error ? error.message : 'Unknown error'),
        requestId 
      };
      console.error(`[Reset API ${requestId}] ❌`, errorResponse);
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // 7-2. 백업 처리
    const step_backup = 'backup';
    let backupCount = 0;
    
    if (certificationsToDelete && certificationsToDelete.length > 0) {
      try {
        console.log(`[Reset API ${requestId}] 📦 Backing up certifications...`);
        
        // 백업 레코드 생성
        const backupRecords = certificationsToDelete.map(cert => ({
          source_id: cert.id,
          user_id: cert.user_id,
          track_id: cert.track_id,
          user_track_id: cert.user_track_id,
          certification_url: cert.certification_url,
          certification_date: cert.certification_date,
          created_at: cert.created_at,
          term_number: cert.term_number || 1
        }));

        // 중복 방지를 위한 ON CONFLICT 처리
        const { error: backupError } = await admin
          .from('certifications_backup')
          .upsert(backupRecords, { 
            onConflict: 'source_id',
            ignoreDuplicates: true 
          });

        if (backupError) {
          const errorResponse = { 
            ok: false, 
            step: step_backup, 
            message: 'Failed to backup certifications: ' + backupError.message,
            requestId 
          };
          console.error(`[Reset API ${requestId}] ❌`, errorResponse);
          return NextResponse.json(errorResponse, { status: 500 });
        }

        backupCount = certificationsToDelete.length;
        console.log(`[Reset API ${requestId}] ✅ Backup completed:`, backupCount, 'records');
        
      } catch (error) {
        const errorResponse = { 
          ok: false, 
          step: step_backup, 
          message: 'Error during backup: ' + (error instanceof Error ? error.message : 'Unknown error'),
          requestId 
        };
        console.error(`[Reset API ${requestId}] ❌`, errorResponse);
        return NextResponse.json(errorResponse, { status: 500 });
      }
    }

    // 7-3. 인증 기록 삭제
    const step_delete = 'delete';
    
    try {
      console.log(`[Reset API ${requestId}] 🗑️ Deleting original certifications...`);
      
      let deleteCount = 0;

      const hasTerm = typeof termNumber === 'number';
      const hasSince = typeof since === 'string' && since.length > 0;

      let del = admin.from('certifications').delete();

      if (hasTerm) del = del.eq('term_number', termNumber as number);
      if (hasSince) del = del.gte('certification_date', since as string);

      // WHERE 절이 하나도 없으면, 최소한의 조건을 강제로 추가
      if (!hasTerm && !hasSince) {
        del = del.gte('certification_date', '0001-01-01');
      }

      const { error: delErr, count: delCnt } = await del.select('id', { count: 'exact' });

      if (delErr) {
        const errorResponse = { 
          ok: false, 
          step: step_delete, 
          message: `Failed to delete certifications: ${delErr.message}`,
          requestId 
        };
        console.error(`[Reset API ${requestId}] ❌`, errorResponse);
        return NextResponse.json(errorResponse, { status: 500 });
      }

      deleteCount = delCnt ?? 0;

      console.log(`[Reset API ${requestId}] ✅ Reset complete:`, {
        backedUp: backupCount,
        deleted: deleteCount,
      });

      return NextResponse.json({
        ok: true,
        step: 'completed',
        backedUp: backupCount,
        deleted: deleteCount,
        mode: 'fallback',
        requestId
      });
      
    } catch (error) {
      const errorResponse = { 
        ok: false, 
        step: step_delete, 
        message: 'Error during delete: ' + (error instanceof Error ? error.message : 'Unknown error'),
        requestId 
      };
      console.error(`[Reset API ${requestId}] ❌`, errorResponse);
      return NextResponse.json(errorResponse, { status: 500 });
    }

  } catch (error) {
    const errorResponse = { 
      ok: false,
      step: step,
      message: 'Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      requestId 
    };
    console.error(`[Reset API ${requestId}] ❌`, errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}