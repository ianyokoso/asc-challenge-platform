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
export function useAllTracksCertificationData(periodId?: string) {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  
  const query = useQuery({
    queryKey: ['certification-tracking', 'all-tracks', periodId || 'default'],
    queryFn: async () => {
      console.log('[Hook] 🚀 Fetching data from API:', { periodId });
      
      const url = periodId 
        ? `/api/admin/certification-tracking?periodId=${periodId}`
        : '/api/admin/certification-tracking';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('[Hook] ❌ API error:', error);
        throw new Error(error.error || 'Failed to fetch certification data');
      }
      
      const result = await response.json();
      console.log('[Hook] ✅ Received data:', result.data?.length, 'tracks');
      console.log('[Hook] ✅ Selected period:', result.selectedPeriod);
      console.log('[Hook] ✅ Available periods:', result.periods?.length);
      return result; // { data, periods, selectedPeriod } 전체를 반환
    },
    staleTime: 1000 * 60 * 5, // 5분 (성능 향상을 위해 증가)
    refetchOnWindowFocus: false, // 창 포커스 시 자동 갱신 비활성화 (성능 향상)
  });

  // Supabase Realtime 구독 - certifications 및 user_tracks 테이블 변경 감지
  useEffect(() => {
    const supabase = createClient();
    
    console.log('[Realtime] 📡 Setting up certification tracking subscription', { periodId });
    setRealtimeStatus('connecting');

    // certifications 테이블의 모든 변경사항(INSERT, UPDATE, DELETE) 구독
    const certChannel = supabase
      .channel(`certification-tracking-${periodId || 'default'}`)
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
            queryKey: ['certification-tracking', 'all-tracks', periodId || 'default'],
          });
        }
      )
      // user_tracks 테이블 변경사항도 구독 (트랙 배정/해제 시)
      .on(
        'postgres_changes',
        {
          event: '*', // 모든 이벤트 타입
          schema: 'public',
          table: 'user_tracks',
        },
        (payload) => {
          console.log('[Realtime] ✅ User track change detected:', {
            eventType: payload.eventType,
            table: payload.table,
            data: payload.new || payload.old,
            timestamp: new Date().toISOString(),
          });
          
          // 트랙 배정 변경 시에도 쿼리 무효화
          queryClient.invalidateQueries({
            queryKey: ['certification-tracking', 'all-tracks', periodId || 'default'],
          });
          
          // 사용자 관련 쿼리들도 무효화
          queryClient.invalidateQueries({
            queryKey: ['users-with-tracks'],
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
      supabase.removeChannel(certChannel);
    };
  }, [periodId, queryClient]);

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
    staleTime: 1000 * 60 * 5, // 5분 (성능 향상을 위해 증가)
    refetchOnWindowFocus: false, // 창 포커스 시 자동 갱신 비활성화 (성능 향상)
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

