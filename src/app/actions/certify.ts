'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

const CertifySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  trackId: z.string().uuid('Invalid track ID'),
  periodId: z.string().uuid('Invalid period ID'),
  certificationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  idempotencyKey: z.string().min(8).optional(),
  certificationUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  userTrackId: z.string().uuid('Invalid user track ID'),
});

export type CertifyInput = z.infer<typeof CertifySchema>;

export type CertifyResult = 
  | { ok: true; certification: any; alreadyApplied?: boolean }
  | { ok: false; code: string; message: string };

/**
 * 단일 쓰기 경로: 인증 제출 Server Action
 * 
 * - 멱등성 보장 (idempotencyKey)
 * - 유니크 제약 기반 upsert (user × track × period)
 * - 전역 캐시 무효화 (calendar, dashboard, tracking)
 */
export async function certifyAction(input: unknown): Promise<CertifyResult> {
  const startTime = Date.now();
  
  // 입력 검증
  let parsed: CertifyInput;
  try {
    parsed = CertifySchema.parse(input);
  } catch (err) {
    console.error('[certifyAction] ❌ Validation error:', err);
    return { 
      ok: false, 
      code: 'VALIDATION_ERROR', 
      message: err instanceof Error ? err.message : 'Invalid input' 
    };
  }

  const { 
    userId, 
    trackId, 
    periodId, 
    certificationDate,
    idempotencyKey, 
    certificationUrl, 
    notes,
    userTrackId,
  } = parsed;

  console.log('[certifyAction] 🚀 Starting certification:', {
    userId,
    trackId,
    periodId,
    certificationDate,
    idempotencyKey,
    hasUrl: !!certificationUrl,
    hasNotes: !!notes,
  });

  const supabase = createClient();

  try {
    // 1. 멱등성 체크: 동일 키로 이미 처리된 적 있으면 조기 반환
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('certifications')
        .select('id, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        console.log('[certifyAction] ⚠️ Idempotency key already used:', idempotencyKey);
        return { ok: true, alreadyApplied: true, certification: existing };
      }
    }

    // 2. 활성 기수 확인 (선택적, 이미 periodId가 있다면 스킵 가능)
    const { data: period, error: periodError } = await supabase
      .from('periods')
      .select('*')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      console.error('[certifyAction] ❌ Period not found:', periodId);
      return { 
        ok: false, 
        code: 'PERIOD_NOT_FOUND', 
        message: '해당 기수를 찾을 수 없습니다.' 
      };
    }

    // 3. 유니크 제약 기반 upsert
    const certificationData: any = {
      user_id: userId,
      track_id: trackId,
      period_id: periodId,
      user_track_id: userTrackId,
      certification_date: certificationDate,
      status: 'submitted',
      certified_at: new Date().toISOString(),
      idempotency_key: idempotencyKey ?? null,
    };

    // certification_url 처리 (빈 문자열 또는 null)
    if (certificationUrl && certificationUrl.trim()) {
      certificationData.certification_url = certificationUrl.trim();
    }

    // notes 처리
    if (notes && notes.trim()) {
      certificationData.notes = notes.trim();
    }

    console.log('[certifyAction] 📦 Upserting certification:', {
      ...certificationData,
      certification_url: certificationData.certification_url ? '[URL]' : null,
      notes: certificationData.notes ? `[${certificationData.notes.length} chars]` : null,
    });

    const { data, error } = await supabase
      .from('certifications')
      .upsert(certificationData, { 
        onConflict: 'user_id,track_id,period_id',
        ignoreDuplicates: false, // 업데이트 허용
      })
      .select()
      .single();

    if (error) {
      console.error('[certifyAction] ❌ Upsert failed:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { 
        ok: false, 
        code: 'UPSERT_FAILED', 
        message: error.message 
      };
    }

    const duration = Date.now() - startTime;
    console.log('[certifyAction] ✅ Certification successful:', {
      certificationId: data.id,
      durationMs: duration,
    });

    // 4. 전역 캐시 무효화: 세 화면 공통 태그 사용
    revalidateTag('certifications');
    revalidateTag(`certifications:user:${userId}`);
    revalidateTag(`certifications:period:${periodId}`);
    revalidateTag(`certifications:track:${trackId}`);
    revalidateTag('dashboard');
    revalidateTag('calendar');
    revalidateTag('tracking');

    return { ok: true, certification: data };

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[certifyAction] ❌ Unexpected error:', {
      error: err,
      durationMs: duration,
    });
    return { 
      ok: false, 
      code: 'UNEXPECTED_ERROR', 
      message: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

