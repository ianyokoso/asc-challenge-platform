'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllTracks, getUserTracks } from '@/lib/supabase/database';

export function useTracks() {
  return useQuery({
    queryKey: ['tracks'],
    queryFn: getAllTracks,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useUserTracks(userId?: string) {
  return useQuery({
    queryKey: ['user-tracks', userId],
    queryFn: () => (userId ? getUserTracks(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute (트랙 변경사항 빠르게 반영)
    refetchOnMount: 'always', // 페이지 접속 시 항상 최신 데이터 가져오기
    refetchOnWindowFocus: true, // 창 포커스 시 새로고침
  });
}

