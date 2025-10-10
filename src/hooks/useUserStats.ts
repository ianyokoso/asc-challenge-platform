import { useQuery } from '@tanstack/react-query';
import { getUserStreak, getUserTotalCertifications, getUserTitles } from '@/lib/supabase/database';

export function useUserStats(userId?: string, trackId?: string) {
  const { data: streak, isLoading: streakLoading } = useQuery({
    queryKey: ['user-streak', userId, trackId],
    queryFn: () => {
      if (!userId || !trackId) return 0;
      return getUserStreak(userId, trackId);
    },
    enabled: !!userId && !!trackId,
  });

  const { data: totalCertifications, isLoading: totalLoading } = useQuery({
    queryKey: ['user-total-certifications', userId, trackId],
    queryFn: () => {
      if (!userId) return 0;
      return getUserTotalCertifications(userId, trackId);
    },
    enabled: !!userId,
  });

  const { data: titles, isLoading: titlesLoading } = useQuery({
    queryKey: ['user-titles', userId],
    queryFn: () => {
      if (!userId) return [];
      return getUserTitles(userId);
    },
    enabled: !!userId,
  });

  return {
    streak: streak || 0,
    totalCertifications: totalCertifications || 0,
    titlesCount: titles?.length || 0,
    isLoading: streakLoading || totalLoading || titlesLoading,
  };
}

