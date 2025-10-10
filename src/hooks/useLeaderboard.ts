'use client';

import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/lib/supabase/database';
import type { TrackType } from '@/lib/supabase/types';

export function useLeaderboard(trackId?: string, limit: number = 100) {
  return useQuery({
    queryKey: ['leaderboard', trackId, limit],
    queryFn: () => getLeaderboard(trackId, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

