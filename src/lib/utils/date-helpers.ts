/**
 * 날짜 관련 헬퍼 함수 (KST 기준)
 */

import { startOfDay, parseISO } from 'date-fns';

/**
 * 날짜를 KST 기준 자정으로 정규화
 * KST는 UTC+9이므로 로컬 시간대와 관계없이 KST로 변환
 */
export function toKSTMidnight(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  
  // 날짜 문자열이 'YYYY-MM-DD' 형식이면 이미 날짜만 있으므로 그대로 사용
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  
  // Date 객체면 시간을 제거하고 날짜만 사용
  return startOfDay(dateObj);
}

/**
 * 두 날짜를 KST 기준으로 비교 (날짜만, 시간 무시)
 * @returns -1 (date1 < date2), 0 (같음), 1 (date1 > date2)
 */
export function compareKSTDates(date1: Date | string, date2: Date | string): number {
  const kst1 = toKSTMidnight(date1);
  const kst2 = toKSTMidnight(date2);
  
  if (kst1.getTime() < kst2.getTime()) return -1;
  if (kst1.getTime() > kst2.getTime()) return 1;
  return 0;
}

/**
 * date1이 date2보다 이전인지 확인 (KST 기준)
 */
export function isBeforeKST(date1: Date | string, date2: Date | string): boolean {
  return compareKSTDates(date1, date2) < 0;
}

/**
 * date1이 date2보다 이후인지 확인 (KST 기준)
 */
export function isAfterKST(date1: Date | string, date2: Date | string): boolean {
  return compareKSTDates(date1, date2) > 0;
}

/**
 * 두 날짜가 같은 날인지 확인 (KST 기준)
 */
export function isSameDayKST(date1: Date | string, date2: Date | string): boolean {
  return compareKSTDates(date1, date2) === 0;
}

/**
 * 날짜가 범위 내에 있는지 확인 (KST 기준, 경계 포함)
 */
export function isWithinRangeKST(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const dateKST = toKSTMidnight(date);
  const startKST = toKSTMidnight(startDate);
  const endKST = toKSTMidnight(endDate);
  
  return dateKST >= startKST && dateKST <= endKST;
}

