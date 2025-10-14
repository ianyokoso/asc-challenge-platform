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
  if (track === 'shortform') {
    // 숏폼은 앵커일 개념 없음 (평일 매일)
    return dateKST;
  }
  
  if (track === 'longform' || track === 'builder') {
    // 롱폼/빌더: 주의 일요일
    return alignToSundayKST(dateKST);
  }
  
  if (track === 'sales') {
    // 세일즈: 주의 화요일
    return alignToWeekdayKST(dateKST, 2);
  }
  
  return dateKST;
}

/**
 * 인증 데이터를 주간 앵커일 기준으로 정규화
 * @param track - 트랙 타입
 * @param certifications - 인증 데이터 배열
 * @returns 앵커일을 키로 하는 Map
 */
function buildWeeklyMap(track: TrackType, certifications: CertificationRecord[]): Map<string, CertificationRecord> {
  const weeklyMap = new Map<string, CertificationRecord>();
  
  console.log('[buildWeeklyMap] 🏗️ Building weekly map for track:', track, 'with certifications:', certifications);
  
  if (track === 'shortform') {
    // 숏폼은 앵커일 정규화 없음
    certifications.forEach(cert => {
      weeklyMap.set(cert.date, cert);
    });
    console.log('[buildWeeklyMap] 📝 Short-form map:', weeklyMap);
    return weeklyMap;
  }
  
  // 주간 트랙: 앵커일 기준으로 정규화
  certifications.forEach(cert => {
    const certDate = startOfDayKST(cert.date);
    const anchorDate = getAnchorDate(track, certDate);
    const anchorKey = format(anchorDate, 'yyyy-MM-dd');
    
    console.log('[buildWeeklyMap] 🔄 Mapping:', {
      originalDate: cert.date,
      certDate: format(certDate, 'yyyy-MM-dd'),
      anchorDate: format(anchorDate, 'yyyy-MM-dd'),
      anchorKey,
      certified: cert.certified
    });
    
    // 같은 앵커일에 여러 건이면 최신 것 우선 (여기서는 단순히 덮어쓰기)
    weeklyMap.set(anchorKey, cert);
  });
  
  console.log('[buildWeeklyMap] ✅ Final weekly map:', weeklyMap);
  return weeklyMap;
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
export type TrackType = 'shortform' | 'longform' | 'builder' | 'sales';

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

  return certDate.getTime() >= startDate.getTime() && certDate.getTime() <= endDate.getTime();
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

  switch (track) {
    case 'shortform':
      // Mon-Fri only
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'longform':
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

  // 앵커일 기준으로 인증 데이터 정규화
  console.log('[CertificationCalendar] 📊 Original records:', records);
  const weeklyCertificationMap = buildWeeklyMap(track, records);
  console.log('[CertificationCalendar] 🔄 Weekly map:', weeklyCertificationMap);

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const isCertified = (date: Date): boolean => {
    if (track === 'shortform') {
      // 숏폼은 실제 제출일 기준
      const dateStr = format(date, 'yyyy-MM-dd');
      return weeklyCertificationMap.get(dateStr)?.certified === true;
    }
    
    // 주간 트랙: 앵커일 기준으로 확인
    const dateKST = startOfDayKST(date);
    const anchorDate = getAnchorDate(track, dateKST);
    const anchorKey = format(anchorDate, 'yyyy-MM-dd');
    const anchorRecord = weeklyCertificationMap.get(anchorKey);
    
    // 현재 날짜가 앵커일인지 확인
    const isAnchorDate = anchorDate.getTime() === dateKST.getTime();
    
    console.log('[isCertified] 🔍 Checking certification for:', {
      date: format(date, 'yyyy-MM-dd'),
      dateKST: format(dateKST, 'yyyy-MM-dd'),
      anchorDate: format(anchorDate, 'yyyy-MM-dd'),
      anchorKey,
      isAnchorDate,
      hasRecord: !!anchorRecord,
      certified: anchorRecord?.certified
    });
    
    // 앵커일이 아니면 인증 상태 없음
    if (!isAnchorDate) {
      return false;
    }
    
    return anchorRecord?.certified === true;
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

  // 통계 계산 (앵커일 기준)
  const calculateStats = () => {
    if (track === 'shortform') {
      // 숏폼: 기존 로직 (평일만)
      const activeDates = daysInMonth.filter(date => {
        const withinCohort = isWithinCohort(date, activePeriod);
        const isWeekendDate = isWeekend(date);
        return withinCohort && !isWeekendDate;
      });

      const certifiedCount = activeDates.filter(date => isCertified(date)).length;
      const totalActiveDays = activeDates.length;
      const completionRate = totalActiveDays > 0 ? Math.round((certifiedCount / totalActiveDays) * 100) : 0;

      return {
        certified: certifiedCount,
        total: totalActiveDays,
        rate: completionRate,
      };
    } else {
      // 주간 트랙: 앵커일 기준으로 계산
      const anchorDates = new Set<string>();
      
      daysInMonth.forEach(date => {
        const withinCohort = isWithinCohort(date, activePeriod);
        if (withinCohort) {
          const dateKST = startOfDayKST(date);
          const anchorDate = getAnchorDate(track, dateKST);
          const isAnchorDate = anchorDate.getTime() === dateKST.getTime();
          
          if (isAnchorDate) {
            const anchorKey = format(anchorDate, 'yyyy-MM-dd');
            anchorDates.add(anchorKey);
          }
        }
      });

      const totalAnchorDays = anchorDates.size;
      const certifiedAnchorDays = Array.from(anchorDates).filter(anchorKey => {
        const anchorRecord = weeklyCertificationMap.get(anchorKey);
        return anchorRecord?.certified === true;
      }).length;

      const completionRate = totalAnchorDays > 0 ? Math.round((certifiedAnchorDays / totalAnchorDays) * 100) : 0;

      return {
        certified: certifiedAnchorDays,
        total: totalAnchorDays,
        rate: completionRate,
      };
    }
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

          // 비활성 조건 결정
          let isInactive = false;
          
          if (!withinCohort) {
            // 기수 기간 외
            isInactive = true;
          } else if (track === 'shortform' && isWeekend(date)) {
            // 숏폼 주말
            isInactive = true;
          } else if (track !== 'shortform') {
            // 주간 트랙: 앵커일이 아니면 비활성
            const dateKST = startOfDayKST(date);
            const anchorDate = getAnchorDate(track, dateKST);
            const isAnchorDate = anchorDate.getTime() === dateKST.getTime();
            if (!isAnchorDate) {
              isInactive = true;
            }
          }

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

                  // 비활성 조건 결정
                  let isInactive = false;
                  
                  if (!withinCohort) {
                    // 기수 기간 외
                    isInactive = true;
                  } else if (track === 'shortform' && isWeekend(date)) {
                    // 숏폼 주말
                    isInactive = true;
                  } else if (track !== 'shortform') {
                    // 주간 트랙: 앵커일이 아니면 비활성
                    const dateKST = startOfDayKST(date);
                    const anchorDate = getAnchorDate(track, dateKST);
                    const isAnchorDate = anchorDate.getTime() === dateKST.getTime();
                    if (!isAnchorDate) {
                      isInactive = true;
                    }
                  }

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

