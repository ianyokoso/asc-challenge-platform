'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  isUserAdmin,
  getAdminStats,
  getAllUsersWithStats,
  getDropoutCandidates 
} from '@/lib/supabase/admin';

export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ['is-admin', userId],
    queryFn: () => (userId ? isUserAdmin(userId) : Promise.resolve(false)),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useAllUsersWithStats() {
  return useQuery({
    queryKey: ['all-users-stats'],
    queryFn: getAllUsersWithStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDropoutCandidates() {
  return useQuery({
    queryKey: ['dropout-candidates'],
    queryFn: getDropoutCandidates,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  });
}

