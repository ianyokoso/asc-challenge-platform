'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTrackCertificationData } from '@/lib/supabase/certification-tracking';

/**
 * 모든 트랙의 인증 현황 데이터 조회 (서버 API 사용 + 실시간 업데이트 지원)
 * 
 * 서버 사이드 API를 통해 RLS를 우회하여 모든 데이터를 조회하고,
 * Supabase Realtime을 사용하여 certifications 테이블의 변경사항을
 * 실시간으로 감지하고 UI를 자동 갱신합니다.
 */
export function useAllTracksCertificationData(year: number, month: number) {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  const query = useQuery({
    queryKey: ['certification-tracking', 'all-tracks', year, month],
    queryFn: async () => {
      console.log('[Hook] 🚀 Fetching data from API:', { year, month });
      
      const response = await fetch(`/api/admin/certification-tracking?year=${year}&month=${month}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[Hook] ❌ API error:', error);
        throw new Error(error.error || 'Failed to fetch certification data');
      }
      
      const result = await response.json();
      console.log('[Hook] ✅ Received data:', result.data?.length, 'tracks');
      return result.data;
    },
    staleTime: 1000 * 60 * 2, // 2분
    refetchOnWindowFocus: true, // 창 포커스 시 자동 갱신
  });

  // Supabase Realtime 구독 - certifications 테이블 변경 감지
  useEffect(() => {
    const supabase = createClient();
    
    console.log('[Realtime] 📡 Setting up certification tracking subscription', { year, month });
    setRealtimeStatus('connecting');

    // certifications 테이블의 모든 변경사항(INSERT, UPDATE, DELETE) 구독
    const channel = supabase
      .channel(`certification-tracking-${year}-${month}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 모든 이벤트 타입
          schema: 'public',
          table: 'certifications',
        },
        (payload) => {
          console.log('[Realtime] ✅ Certification change detected:', {
            eventType: payload.eventType,
            table: payload.table,
            data: payload.new || payload.old,
            timestamp: new Date().toISOString(),
          });
          
          // 데이터 변경 시 해당 쿼리 무효화 → 자동 refetch
          queryClient.invalidateQueries({
            queryKey: ['certification-tracking', 'all-tracks', year, month],
          });
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] 📊 Subscription status changed:', status, err);
        
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Successfully subscribed to certification changes');
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Channel subscription error:', err);
          setRealtimeStatus('error');
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ⏱️ Subscription timed out');
          setRealtimeStatus('error');
        } else if (status === 'CLOSED') {
          console.log('[Realtime] 🔌 Channel closed');
          setRealtimeStatus('disconnected');
        }
      });

    // Cleanup: 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[Realtime] 🔌 Unsubscribing from certification tracking');
      setRealtimeStatus('disconnected');
      supabase.removeChannel(channel);
    };
  }, [year, month, queryClient]);

  return { ...query, realtimeStatus };
}

/**
 * 특정 트랙의 인증 현황 데이터 조회 (실시간 업데이트 지원)
 * 
 * Supabase Realtime을 사용하여 해당 트랙의 certifications 변경사항을
 * 실시간으로 감지하고 UI를 자동 갱신합니다.
 */
export function useTrackCertificationData(trackId: string, year: number, month: number) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['certification-tracking', trackId, year, month],
    queryFn: () => getTrackCertificationData(trackId, year, month),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 2, // 2분
    refetchOnWindowFocus: true, // 창 포커스 시 자동 갱신
  });

  // Supabase Realtime 구독 - 특정 트랙의 certifications 변경 감지
  useEffect(() => {
    if (!trackId) return;

    const supabase = createClient();
    
    console.log('[Realtime] 📡 Setting up track certification subscription', { trackId, year, month });

    // certifications 테이블의 해당 트랙 변경사항 구독
    const channel = supabase
      .channel(`track-certification-${trackId}-${year}-${month}`)
      .on(
        'postgres_changes',
        {
          event: '*', // 모든 이벤트 타입
          schema: 'public',
          table: 'certifications',
          // 필터: 특정 트랙의 user_tracks에 속한 인증만
          // (실제로는 서버에서 필터링되지 않으므로 클라이언트에서 쿼리 무효화)
        },
        (payload) => {
          console.log('[Realtime] ✅ Track certification change detected:', {
            eventType: payload.eventType,
            trackId,
            timestamp: new Date().toISOString(),
          });
          
          // 데이터 변경 시 해당 트랙 쿼리 무효화 → 자동 refetch
          queryClient.invalidateQueries({
            queryKey: ['certification-tracking', trackId, year, month],
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✅ Successfully subscribed to track certification changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ❌ Track channel subscription error');
        }
      });

    // Cleanup: 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('[Realtime] 🔌 Unsubscribing from track certification tracking');
      supabase.removeChannel(channel);
    };
  }, [trackId, year, month, queryClient]);

  return query;
}

