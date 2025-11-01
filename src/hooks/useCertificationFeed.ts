import { useQuery } from '@tanstack/react-query';
import { getTrackCertificationFeed, type CertificationFeedItem } from '@/lib/supabase/certification-tracking';

/**
 * 빌더/세일즈 트랙의 인증 피드 데이터를 가져오는 훅
 */
export function useCertificationFeed(
  trackType: 'builder' | 'sales' | null,
  periodId?: string,
  enabled: boolean = true
) {
  return useQuery<CertificationFeedItem[], Error>({
    queryKey: ['certification-feed', trackType, periodId],
    queryFn: () => getTrackCertificationFeed(trackType!, periodId),
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: true,
    enabled: enabled && !!trackType, // enabled 플래그와 trackType 체크
  });
}

