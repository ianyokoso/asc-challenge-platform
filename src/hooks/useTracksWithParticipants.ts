import { useQuery } from '@tanstack/react-query';
import { getAllTracksWithParticipants } from '@/lib/supabase/database';

export function useTracksWithParticipants() {
  return useQuery({
    queryKey: ['tracks-with-participants'],
    queryFn: getAllTracksWithParticipants,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

