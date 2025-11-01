'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
  isAfter,
  startOfWeek,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toKSTMidnight } from '@/lib/utils/date-helpers';

// KST 시간대 유틸리티
const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간 (밀리초)
const DAY = 24 * 60 * 60 * 1000;

/**
 * KST 기준으로 날짜를 처리하는 유틸리티 함수들
 */
const toKST = (d: Date | string) => new Date((typeof d === 'string' ? new Date(d) : d).getTime() + KST_OFFSET);
const startOfDayKST = (d: Date | string) => {
  const k = toKST(d);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
};
const addDaysKST = (d: Date | string, days: number) => new Date(startOfDayKST(d).getTime() + days * DAY);
const getKSTDay = (d: Date | string) => toKST(d).getUTCDay(); // 0=일,1=월,2=화...
const alignToSundayKST = (d: Date | string) => {
  const dateKST = startOfDayKST(d);
  const dayOfWeek = dateKST.getDay(); // 0=일요일, 1=월요일, ...
  // 해당 주의 일요일로 이동
  return addDaysKST(dateKST, -dayOfWeek);
};

const alignToWeekdayKST = (d: Date | string, weekday: number) => {
  // 먼저 일요일로 정렬한 후, 원하는 요일로 이동
  const sunday = alignToSundayKST(d);
  return addDaysKST(sunday, weekday);
};

/**
 * 트랙별 앵커일(주간 인증일) 계산
 * @param track - 트랙 타입
 * @param dateKST - KST 기준 날짜
 * @returns 해당 주의 앵커일
 */
function getAnchorDate(track: TrackType, dateKST: Date): Date {
  const day = dateKST.getDay(); // 0=일, 1=월, ...
  
  if (track === 'short-form') {
    // 숏폼은 앵커일 개념 없음 (평일 매일)
    return startOfDayKST(dateKST);
  }
  
  if (track === 'long-form' || track === 'builder') {
    // 롱폼/빌더: 다음 일요일 기준
    const diff = (7 - day) % 7;  // 다음 일요일까지 남은 일수
    return addDaysKST(startOfDayKST(dateKST), diff);
  }
  
  if (track === 'sales') {
    // 세일즈: 해당 주의 화요일 기준
    const target = 2; // 화
    let diff = target - day;
    if (diff < 0) diff += 7; // 화요일이 지났으면 다음주 화요일 (당일은 포함)
    return addDaysKST(startOfDayKST(dateKST), diff);
  }
  
  return startOfDayKST(dateKST);
}


/**
 * Certification record type
 */
export interface CertificationRecord {
  date: string; // 'YYYY-MM-DD' format
  certified: boolean;
}

/**
 * Track type definition
 */
export type TrackType = 'short-form' | 'long-form' | 'builder' | 'sales';

/**
 * 트랙 키 정규화 함수
 * @param t - 입력 트랙 문자열
 * @returns 정규화된 TrackType
 */
function normalizeTrack(t: string): TrackType {
  switch (t) {
    case 'shortform':
      return 'short-form';
    case 'longform':
      return 'long-form';
    default:
      return t as TrackType;
  }
}

/**
 * Active period interface
 */
export interface ActivePeriod {
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
 * Props for CertificationCalendar component
 */
export interface CertificationCalendarProps {
  /**
   * Array of certification records
   */
  records: CertificationRecord[];
  /**
   * Track type to determine which days are active
   */
  track?: TrackType;
  /**
   * Handler called when a certified date is clicked
   */
  onDateClick?: (date: string) => void;
  /**
   * Optional initial month to display
   */
  initialMonth?: Date;
  /**
   * Active period to determine valid certification dates
   */
  activePeriod?: ActivePeriod | null;
}

/**
 * Check if date is within active period (기수 범위)
 * @param date Date to check
 * @param activePeriod Active period information
 * @returns true if the date is within the active period
 */
const isWithinCohort = (date: Date, activePeriod?: ActivePeriod | null): boolean => {
  if (!activePeriod) return true; // If no active period, all dates are valid

  const certDate = toKSTMidnight(date);
  const startDate = toKSTMidnight(activePeriod.start_date);
  const endDate = toKSTMidnight(activePeriod.end_date);

  const isWithin = certDate.getTime() >= startDate.getTime() && certDate.getTime() <= endDate.getTime();
  
  // 디버깅을 위한 로깅 (특정 날짜에만)
  if (date.getDate() === 5 || date.getDate() === 12) {
    console.log('[isWithinCohort] Debug:', {
      date: format(date, 'yyyy-MM-dd'),
      certDate: format(certDate, 'yyyy-MM-dd'),
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      isWithin,
      activePeriod: activePeriod ? {
        start_date: activePeriod.start_date,
        end_date: activePeriod.end_date
      } : null
    });
  }

  return isWithin;
};

/**
 * Check if date is weekend (Saturday or Sunday)
 * @param date Date to check
 * @returns true if the date is weekend
 */
const isWeekend = (date: Date): boolean => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * Get active days for each track type
 * @param track Track type
 * @param date Date to check
 * @returns true if the date is active for the track
 */
const isActiveDayForTrack = (track: TrackType | undefined, date: Date): boolean => {
  if (!track) return true; // If no track specified, all days are active

  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  const normalizedTrack = track ? normalizeTrack(track) : undefined;
  
  switch (normalizedTrack) {
    case 'short-form':
      // Mon-Fri only
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'long-form':
    case 'builder':
      // Sunday only
      return dayOfWeek === 0;
    case 'sales':
      // Tuesday only
      return dayOfWeek === 2;
    default:
      return true;
  }
};

/**
 * CertificationCalendar Component
 * 
 * A self-contained calendar component that displays certification status
 * for a monthly view. Supports different track types with different active days.
 */
export function CertificationCalendar({
  records,
  track,
  onDateClick,
  initialMonth = new Date(),
  activePeriod,
}: CertificationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialMonth);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // ✅ 공통: KST 키 유틸
  const dateKeyKST = (d: Date | string) =>
    format(startOfDayKST(d), 'yyyy-MM-dd');

  // 1) 맵/셋 생성 (records = 제출 레코드 배열)
  const certifiedDaySet = new Set<string>();     // 숏폼: 해당 '그날' 키
  const anchorCertifiedSet = new Set<string>();  // 주간 트랙: '앵커일' 키

  console.log('[CertificationCalendar] 📊 Original records:', records);
  
  // 트랙 키 정규화
  const normalizedTrack = track ? normalizeTrack(track) : undefined;
  
  records.forEach((r) => {
    if (!r.certified) return; // 인증되지 않은 레코드는 무시
    
    const rec = startOfDayKST(r.date);
    if (normalizedTrack === 'short-form') {
      certifiedDaySet.add(dateKeyKST(rec));
    } else {
      // ➜ 레코드마다 '그 레코드가 속하는 앵커일'을 계산해 해당 앵커일 키에 체크
      const anchor = getAnchorDate(normalizedTrack!, rec); // long-form/builder: 일요일, sales: 화요일
      anchorCertifiedSet.add(dateKeyKST(anchor));
      
      // 디버그 로깅
      if (normalizedTrack === 'long-form') {
        console.debug('[anchor] long-form rec=%s -> anchor=%s', dateKeyKST(rec), dateKeyKST(anchor));
      }
    }
  });
  
  console.log('[CertificationCalendar] 🗺️ Certified day set:', certifiedDaySet);
  console.log('[CertificationCalendar] 🎯 Anchor certified set:', anchorCertifiedSet);

  // 2) 셀 상태 판단 헬퍼 함수들
  const isAnchorDay = (track: TrackType, date: Date) => {
    const d = startOfDayKST(date);
    const normalizedTrack = normalizeTrack(track);
    const anchorOfD = getAnchorDate(normalizedTrack, d);
    return dateKeyKST(anchorOfD) === dateKeyKST(d);
  };

  const isActivatable = (date: Date): boolean => {
    // 기수 범위 체크(필수) - 더 명확한 날짜 비교
    if (activePeriod) {
      const certDateStr = format(date, 'yyyy-MM-dd');
      const startDateStr = activePeriod.start_date.split('T')[0]; // ISO 문자열에서 날짜 부분만 추출
      const endDateStr = activePeriod.end_date.split('T')[0];
      
      // 기수 시작일 이전이거나 종료일 이후면 비활성
      if (certDateStr < startDateStr || certDateStr > endDateStr) {
        // 모든 날짜에 대한 디버깅 로깅 (기수 기간 밖의 날짜들)
        console.log('[isActivatable] Date outside cohort:', {
          date: certDateStr,
          startDate: startDateStr,
          endDate: endDateStr,
          isBeforeStart: certDateStr < startDateStr,
          isAfterEnd: certDateStr > endDateStr,
          activePeriod: {
            start_date: activePeriod.start_date,
            end_date: activePeriod.end_date
          }
        });
        return false;
      }
    } else {
      console.warn('[isActivatable] No active period provided!');
    }

    const dow = getKSTDay(date); // 0=일 1=월 ... 2=화 ... 6=토

    if (normalizedTrack === 'short-form') {
      // 월~금만 활성
      return dow >= 1 && dow <= 5;
    }
    if (normalizedTrack === 'sales') {
      // 앵커일=화요일만 활성
      return dow === 2;
    }
    // long-form, builder: 앵커일=일요일만 활성
    return dow === 0;
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const isCertified = (date: Date): boolean => {
    const key = dateKeyKST(date);

    if (normalizedTrack === 'short-form') {
      // 그날 제출 여부
      return certifiedDaySet.has(key);
    }

    // 주간 트랙: 앵커일만 완료 판단, 그 외는 중립(비활성)
    if (!isAnchorDay(normalizedTrack!, date)) return false;

    // 앵커일 셀에 '해당 주에 제출이 있었는가?' → 미리 만든 집합으로 O(1)
    return anchorCertifiedSet.has(key);
  };

  const isPastDate = (date: Date): boolean => {
    return isBefore(date, startOfDay(new Date()));
  };

  const handleDateClick = (date: Date) => {
    if (isCertified(date) && onDateClick) {
      const dateStr = format(date, 'yyyy-MM-dd');
      onDateClick(dateStr);
    }
  };

  // 통계 계산 (새로운 효율적 로직)
  const calculateStats = () => {
    // 활성화 가능한 날짜들만 필터링
    const activatableDates = daysInMonth.filter(date => isActivatable(date));
    
    // 인증된 날짜 개수 계산
    const certifiedCount = activatableDates.filter(date => isCertified(date)).length;
    const totalActiveDays = activatableDates.length;
    const completionRate = totalActiveDays > 0 ? Math.round((certifiedCount / totalActiveDays) * 100) : 0;

    return {
      certified: certifiedCount,
      total: totalActiveDays,
      rate: completionRate,
    };
  };

  const stats = calculateStats();

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-h4 font-heading text-gray-900">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <p className="text-body-sm text-gray-600 mt-1">
            이번 달 진행률: {stats.certified}/{stats.total} ({stats.rate}%)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={previousMonth}
            aria-label="이전 달"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextMonth}
            aria-label="다음 달"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div
            key={day}
            className="text-center text-body-sm font-semibold text-gray-500 p-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - Desktop View (7 columns) */}
      <div className="hidden md:grid md:grid-cols-7 gap-2">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days */}
        {daysInMonth.map((date) => {
          const certified = isCertified(date);
          const today = isToday(date);
          const past = isPastDate(date);
          const activeDay = isActiveDayForTrack(track, date);
          const withinCohort = isWithinCohort(date, activePeriod);
          const isCurrentMonth = isSameMonth(date, currentDate);

          // 비활성 조건 결정: isActivatable 함수 사용
          const isInactive = !isActivatable(date);

          if (isInactive) {
            return (
              <div
                key={date.toISOString()}
                className={`aspect-square p-2 rounded-lg border-2 transition-all border-gray-200 bg-gray-100 text-gray-400 cursor-default ${
                  !isCurrentMonth ? 'opacity-40' : ''
                }`}
                aria-label={`${format(date, 'M월 d일')} 비활성`}
              >
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span
                    className={`text-body-sm font-semibold ${
                      !isCurrentMonth ? 'text-gray-400' : 'text-gray-400'
                    }`}
                  >
                    {format(date, 'd')}
                  </span>
                  <MinusCircle className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            );
          }

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={!certified}
              className={`aspect-square p-2 rounded-lg border-2 transition-all ${
                today
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200'
              } ${
                certified
                  ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
                  : past
                  ? 'bg-red-50 hover:bg-red-100 cursor-pointer'
                  : 'hover:bg-gray-50'
              } ${
                !isCurrentMonth ? 'opacity-40' : ''
              }`}
              aria-label={`${format(date, 'M월 d일')} ${certified ? '인증 완료' : '미인증'}`}
            >
              <div className="flex flex-col items-center justify-center h-full gap-1">
                <span
                  className={`text-body-sm font-semibold ${
                    today
                      ? 'text-primary'
                      : !isCurrentMonth
                      ? 'text-gray-400'
                      : 'text-gray-900'
                  }`}
                >
                  {format(date, 'd')}
                </span>
                {certified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : past && activeDay ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar Grid - Mobile View (2-week stacked) */}
      <div className="md:hidden space-y-4">
        {/* Split days into weeks */}
        {Array.from({ length: Math.ceil((monthStart.getDay() + daysInMonth.length) / 7) }).map((_, weekIndex) => {
          const weekStart = weekIndex * 7 - monthStart.getDay();
          const weekEnd = weekStart + 7;
          const weekDays = daysInMonth.slice(Math.max(0, weekStart), Math.min(daysInMonth.length, weekEnd));
          
          // Add empty cells at the beginning if needed
          const emptyBefore = weekIndex === 0 ? monthStart.getDay() : 0;
          
          return (
            <div key={`week-${weekIndex}`} className="space-y-2">
              <p className="text-body-sm font-semibold text-gray-600">
                {weekIndex + 1}주차
              </p>
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells */}
                {Array.from({ length: emptyBefore }).map((_, i) => (
                  <div key={`empty-mobile-${i}`} className="aspect-square" />
                ))}
                
                {/* Days */}
                {weekDays.map((date) => {
                  const certified = isCertified(date);
                  const today = isToday(date);
                  const past = isPastDate(date);
                  const activeDay = isActiveDayForTrack(track, date);
                  const withinCohort = isWithinCohort(date, activePeriod);

                  // 비활성 조건 결정: isActivatable 함수 사용
                  const isInactive = !isActivatable(date);

                  if (isInactive) {
                    return (
                      <div
                        key={date.toISOString()}
                        className="aspect-square p-1 rounded-lg border-2 transition-all border-gray-200 bg-gray-100 text-gray-400 cursor-default"
                        aria-label={`${format(date, 'M월 d일')} 비활성`}
                      >
                        <div className="flex flex-col items-center justify-center h-full gap-0.5">
                          <span className="text-body-xs font-semibold text-gray-400">
                            {format(date, 'd')}
                          </span>
                          <MinusCircle className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleDateClick(date)}
                      disabled={!certified}
                      className={`aspect-square p-1 rounded-lg border-2 transition-all ${
                        today
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200'
                      } ${
                        certified
                          ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
                          : past
                          ? 'bg-red-50 hover:bg-red-100 cursor-pointer'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center h-full gap-0.5">
                        <span className={`text-body-xs font-semibold ${today ? 'text-primary' : 'text-gray-900'}`}>
                          {format(date, 'd')}
                        </span>
                        {certified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : past && activeDay ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-body-sm text-gray-600">인증 완료</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="text-body-sm text-gray-600">미인증</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-primary rounded" />
          <span className="text-body-sm text-gray-600">오늘</span>
        </div>
        <div className="flex items-center gap-2">
          <MinusCircle className="h-5 w-5 text-gray-400" />
          <span className="text-body-sm text-gray-600">비활성</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Mock data generator for testing
 */
export function generateMockCertificationData(): CertificationRecord[] {
  const records: CertificationRecord[] = [];
  const today = new Date();
  
  // Generate data for the current month
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  days.forEach((date) => {
    // Only certify weekdays and some random dates
    const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
    const isPast = isBefore(date, startOfDay(today));
    const shouldCertify = isWeekday && isPast && Math.random() > 0.2; // 80% certification rate
    
    records.push({
      date: format(date, 'yyyy-MM-dd'),
      certified: shouldCertify,
    });
  });
  
  return records;
}

