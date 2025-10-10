'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  getUserProfile, 
  getUserTracks, 
  getUserTitles,
  getUserStreak,
  getUserTotalCertifications,
  getCertifications
} from '@/lib/supabase/database';

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => (userId ? getUserProfile(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

  const totalCertificationsQuery = useQuery({
    queryKey: ['user-total-certifications', userId, trackId],
    queryFn: () => {
      if (!userId) return Promise.resolve(0);
      return getUserTotalCertifications(userId, trackId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    streak: streakQuery.data || 0,
    totalCertifications: totalCertificationsQuery.data || 0,
    isLoading: streakQuery.isLoading || totalCertificationsQuery.isLoading,
  };
}

export function useUserCertifications(userId?: string, trackId?: string) {
  return useQuery({
    queryKey: ['user-certifications', userId, trackId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return getCertifications(userId, trackId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

