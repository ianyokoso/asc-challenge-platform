'use client';

import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Supabase Realtime 브릿지
 * 
 * certifications 테이블의 변경사항을 실시간으로 감지하고
 * React Query 캐시를 무효화하여 즉시 반영
 */
export function RealtimeCertificationsBridge() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[RealtimeBridge] 🔌 Setting up realtime subscription');

    const channel = supabase
      .channel('certifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'certifications',
        },
        (payload) => {
          console.log('[RealtimeBridge] 📡 Certification changed:', {
            event: payload.eventType,
            id: (payload.new as any)?.id || (payload.old as any)?.id,
          });

          // 모든 certifications 관련 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: ['certifications'] });
        }
      )
      .subscribe((status) => {
        console.log('[RealtimeBridge] 📊 Subscription status:', status);
      });

    return () => {
      console.log('[RealtimeBridge] 🔌 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  return null; // 렌더링 없음
}

