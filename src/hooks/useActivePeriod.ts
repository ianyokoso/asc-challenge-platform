import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

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
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시 유지
    retry: 3,
  });
}

/**
 * 인증 날짜가 활성 기수 기간 내에 있는지 확인하는 헬퍼 함수
 */
export function isWithinActivePeriod(
  certificationDate: Date,
  activePeriod: Period | null | undefined
): { isValid: boolean; message?: string } {
  // 활성 기수가 없으면 항상 허용
  if (!activePeriod) {
    return { isValid: true };
  }

  const startDate = new Date(activePeriod.start_date);
  const endDate = new Date(activePeriod.end_date);

  // 날짜를 자정 기준으로 비교하기 위해 시간 제거
  const certDate = new Date(certificationDate);
  certDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (certDate < startDate) {
    return {
      isValid: false,
      message: `${activePeriod.term_number}기는 ${activePeriod.start_date}부터 시작됩니다.`,
    };
  }

  if (certDate > endDate) {
    return {
      isValid: false,
      message: `${activePeriod.term_number}기는 ${activePeriod.end_date}에 종료되었습니다.`,
    };
  }

  return { isValid: true };
}

