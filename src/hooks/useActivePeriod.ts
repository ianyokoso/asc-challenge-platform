import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toKSTMidnight, isBeforeKST, isAfterKST, isWithinRangeKST } from '@/lib/utils/date-helpers';

export interface Period {
  id: string;
  term_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 현재 활성화된 기수 정보를 가져오는 훅
 */
export function useActivePeriod() {
  return useQuery<Period | null>({
    queryKey: ['active-period'],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active period:', error);
        throw new Error('활성 기수를 불러오는데 실패했습니다.');
      }

      return data;
    },
    staleTime: 30 * 1000, // 30초 동안 캐시 유지 (더 자주 업데이트)
    retry: 3,
  });
}

/**
 * 인증 날짜가 활성 기수 기간 내에 있는지 확인하는 헬퍼 함수 (KST 기준)
 * 
 * 규칙:
 * - 기수 전체 기간(start_date ~ end_date) 내의 모든 날짜는 인증 가능
 * - 시작일 이전 또는 종료일 이후는 불가
 */
export function isWithinActivePeriod(
  certificationDate: Date,
  activePeriod: Period | null | undefined
): { isValid: boolean; message?: string } {
  // 활성 기수가 없으면 항상 허용
  if (!activePeriod) {
    return { isValid: true };
  }

  // KST 기준으로 날짜 정규화
  const certDate = toKSTMidnight(certificationDate);
  const startDate = toKSTMidnight(activePeriod.start_date);
  const endDate = toKSTMidnight(activePeriod.end_date);

  // 시작일 이전
  if (isBeforeKST(certDate, startDate)) {
    return {
      isValid: false,
      message: `${activePeriod.term_number}기는 ${activePeriod.start_date}부터 시작됩니다.`,
    };
  }

  // 종료일 이후
  if (isAfterKST(certDate, endDate)) {
    return {
      isValid: false,
      message: `${activePeriod.term_number}기는 ${activePeriod.end_date}에 종료되었습니다.`,
    };
  }

  // 기수 기간 내 - 모든 날짜 허용
  return { isValid: true };
}

