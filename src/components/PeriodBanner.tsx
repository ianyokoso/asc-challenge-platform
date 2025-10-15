'use client';

import { useActivePeriod } from '@/hooks/useActivePeriod';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getNow } from '@/lib/utils/demo-time';
import { toKSTMidnight } from '@/lib/utils/date-helpers';

export function PeriodBanner() {
  const { data: activePeriod, isLoading } = useActivePeriod();

  // 로딩 중이거나 활성 기수가 없으면 표시하지 않음
  if (isLoading || !activePeriod) {
    return null;
  }

  const today = toKSTMidnight(getNow()); // 데모 모드 고려 + KST 기준
  const startDate = toKSTMidnight(activePeriod.start_date);
  const endDate = toKSTMidnight(activePeriod.end_date);
  const daysRemaining = differenceInDays(endDate, today);
  
  // 기간이 임박했는지 확인 (7일 이하)
  const isEndingSoon = daysRemaining <= 7 && daysRemaining >= 0;
  const isEnded = daysRemaining < 0;

  return (
    <div
      className={`border-b ${
        isEnded
          ? 'bg-red-50 border-red-200'
          : isEndingSoon
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isEnded ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            ) : isEndingSoon ? (
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            ) : (
              <CalendarDays className="h-5 w-5 text-blue-600 flex-shrink-0" />
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={`${
                  isEnded
                    ? 'bg-red-100 text-red-700'
                    : isEndingSoon
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                } text-body-xs font-semibold`}
              >
                {activePeriod.term_number}기 챌린지
              </Badge>
              
              <span
                className={`text-body-sm ${
                  isEnded
                    ? 'text-red-800'
                    : isEndingSoon
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                } font-medium`}
              >
                {format(new Date(activePeriod.start_date), 'yyyy.MM.dd', { locale: ko })}
                {' ~ '}
                {format(new Date(activePeriod.end_date), 'yyyy.MM.dd', { locale: ko })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEnded ? (
              <span className="text-body-sm text-red-700 font-medium">
                종료됨
              </span>
            ) : isEndingSoon ? (
              <span className="text-body-sm text-yellow-700 font-medium">
                마감 {daysRemaining}일 전
              </span>
            ) : (
              <span className="text-body-sm text-blue-700">
                {daysRemaining}일 남음
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

