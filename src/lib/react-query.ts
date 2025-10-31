/**
 * React Query 설정
 * 
 * - QueryClient 생성 및 export
 * - Provider 컴포넌트
 */

import { QueryClient } from '@tanstack/react-query';

// QueryClient 인스턴스 생성 (싱글턴)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1분
      gcTime: 1000 * 60 * 5, // 5분 (구 cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * React Query 훅에서 사용할 Query Key 팩토리
 */
export const queryKeys = {
  certifications: {
    all: ['certifications'] as const,
    calendar: (periodId: string, userId?: string) => 
      ['certifications', 'calendar', periodId, userId].filter(Boolean) as const,
    dashboard: () => ['certifications', 'dashboard'] as const,
    tracking: (periodId: string) => ['certifications', 'tracking', periodId] as const,
    byUser: (userId: string) => ['certifications', 'user', userId] as const,
    byPeriod: (periodId: string) => ['certifications', 'period', periodId] as const,
    byTrack: (trackId: string) => ['certifications', 'track', trackId] as const,
  },
};

