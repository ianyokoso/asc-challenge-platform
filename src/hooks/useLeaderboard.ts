'use client';

import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/lib/supabase/database';
import type { TrackType } from '@/lib/supabase/types';

export function useLeaderboard(trackId?: string, limit: number = 100, isAdmin: boolean = false) {
  return useQuery({
    queryKey: ['leaderboard', trackId, limit, isAdmin],
    queryFn: () => getLeaderboard(trackId, limit, isAdmin),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

