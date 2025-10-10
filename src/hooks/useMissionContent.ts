import { useQuery } from '@tanstack/react-query';
import { getMissionContent } from '@/lib/supabase/database';

export function useMissionContent(trackId?: string, date?: string) {
  return useQuery({
    queryKey: ['mission-content', trackId, date],
    queryFn: () => {
      if (!trackId || !date) return null;
      return getMissionContent(trackId, date);
    },
    enabled: !!trackId && !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

