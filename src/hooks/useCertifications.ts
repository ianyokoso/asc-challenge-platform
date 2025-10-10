'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getCertifications, 
  getCalendarCertifications,
  getUserStreak,
  getUserTotalCertifications 
} from '@/lib/supabase/database';

export function useCertifications(userId?: string, trackId?: string) {
  return useQuery({
    queryKey: ['certifications', userId, trackId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return getCertifications(userId, trackId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCalendarCertifications(
  userId?: string,
  trackId?: string,
  year?: number,
  month?: number
) {
  return useQuery({
    queryKey: ['calendar-certifications', userId, trackId, year, month],
    queryFn: () => {
      if (!userId || !trackId || !year || !month) {
        return Promise.resolve([]);
      }
      return getCalendarCertifications(userId, trackId, year, month);
    },
    enabled: !!userId && !!trackId && !!year && !!month,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserStats(userId?: string, trackId?: string) {
  const streakQuery = useQuery({
    queryKey: ['user-streak', userId, trackId],
    queryFn: () => {
      if (!userId || !trackId) return Promise.resolve(0);
      return getUserStreak(userId, trackId);
    },
    enabled: !!userId && !!trackId,
    staleTime: 1000 * 60 * 5,
  });

  const totalQuery = useQuery({
    queryKey: ['user-total', userId, trackId],
    queryFn: () => {
      if (!userId) return Promise.resolve(0);
      return getUserTotalCertifications(userId, trackId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    streak: streakQuery.data || 0,
    totalCertifications: totalQuery.data || 0,
    isLoading: streakQuery.isLoading || totalQuery.isLoading,
  };
}

