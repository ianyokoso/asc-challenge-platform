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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

