'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getAllTracksCertificationData,
  getTrackCertificationData 
} from '@/lib/supabase/certification-tracking';

/**
 * 모든 트랙의 인증 현황 데이터 조회
 */
export function useAllTracksCertificationData(year: number, month: number) {
  return useQuery({
    queryKey: ['certification-tracking', 'all-tracks', year, month],
    queryFn: () => getAllTracksCertificationData(year, month),
    staleTime: 1000 * 60 * 2, // 2분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 새로고침
  });
}

/**
 * 특정 트랙의 인증 현황 데이터 조회
 */
export function useTrackCertificationData(trackId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['certification-tracking', trackId, year, month],
    queryFn: () => getTrackCertificationData(trackId, year, month),
    enabled: !!trackId,
    staleTime: 1000 * 60 * 2, // 2분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 새로고침
  });
}

