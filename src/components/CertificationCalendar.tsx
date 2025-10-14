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
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toKSTMidnight } from '@/lib/utils/date-helpers';

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

  // Create a map for quick lookup of certification status
  const certificationMap = new Map<string, boolean>();
  records.forEach((record) => {
    certificationMap.set(record.date, record.certified);
  });

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const isCertified = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return certificationMap.get(dateStr) === true;
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

  // 통계 계산 (비활성 날짜 제외)
  const calculateStats = () => {
    const activeDates = daysInMonth.filter(date => {
      const withinCohort = isWithinCohort(date, activePeriod);
      const isWeekendDate = isWeekend(date);
      return withinCohort && !(track === 'shortform' && isWeekendDate);
    });

    const certifiedCount = activeDates.filter(date => isCertified(date)).length;
    const totalActiveDays = activeDates.length;
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

          // 비활성 조건: 기수 기간 외 OR 숏폼 주말
          const isInactive = !withinCohort || (track === 'shortform' && isWeekend(date));

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
                  ? 'bg-accent/10 hover:bg-accent/20 cursor-pointer'
                  : !activeDay
                  ? 'bg-gray-100 text-gray-400'
                  : past && activeDay
                  ? 'bg-gray-50'
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

                  // 비활성 조건: 기수 기간 외 OR 숏폼 주말
                  const isInactive = !withinCohort || (track === 'shortform' && isWeekend(date));

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
                          ? 'bg-accent/10 hover:bg-accent/20 cursor-pointer'
                          : !activeDay
                          ? 'bg-gray-100 text-gray-400'
                          : past && activeDay
                          ? 'bg-gray-50'
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

