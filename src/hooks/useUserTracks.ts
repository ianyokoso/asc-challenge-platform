import { useQuery } from '@tanstack/react-query';
import { getUserTracks } from '@/lib/supabase/database';

export function useUserTracks(userId?: string) {
  return useQuery({
    queryKey: ['user-tracks', userId],
    queryFn: () => {
      if (!userId) return [];
      return getUserTracks(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

