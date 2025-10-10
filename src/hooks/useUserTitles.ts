import { useQuery } from '@tanstack/react-query';
import { getUserTitles } from '@/lib/supabase/database';

export function useUserTitles(userId?: string) {
  return useQuery({
    queryKey: ['user-titles', userId],
    queryFn: () => {
      if (!userId) return [];
      return getUserTitles(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

