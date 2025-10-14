// 인증 날짜 관련 유틸리티 함수 (KST 기준)

import { addDays, nextSunday, nextTuesday, startOfWeek } from 'date-fns';
import { TrackType } from '../supabase/types';
import { getNow } from './demo-time';
import { toKSTMidnight, isAfterKST, isBeforeKST } from './date-helpers';

/**
 * 주간 트랙(Long-form, Builder, Sales)의 다음 인증일을 계산
 * 
 * 규칙:
 * - Long-form, Builder: 일요일 마감 (다음 주 일요일)
 * - Sales: 화요일 마감 (다음 주 화요일)
 * - 인증일 1주일 전부터 미리 인증 가능
 */
export function getNextCertificationDate(trackType: TrackType, lastCertificationDate?: Date): Date {
  const today = toKSTMidnight(getNow());
  
  // Short-form은 매일 인증
  if (trackType === 'short-form') {
    return today;
  }
  
  // 마지막 인증일이 있는 경우
  if (lastCertificationDate) {
    const lastCertDate = toKSTMidnight(lastCertificationDate);
    
    // Long-form, Builder: 마지막 인증일의 다음 주 일요일
    if (trackType === 'long-form' || trackType === 'builder') {
      const nextWeekStart = addDays(lastCertDate, 7);
      return nextSunday(nextWeekStart);
    }
    
    // Sales: 마지막 인증일의 다음 주 화요일
    if (trackType === 'sales') {
      const nextWeekStart = addDays(lastCertDate, 7);
      return nextTuesday(nextWeekStart);
    }
  }
  
  // 마지막 인증일이 없는 경우 (첫 인증)
  // Long-form, Builder: 이번 주 또는 다음 주 일요일
  if (trackType === 'long-form' || trackType === 'builder') {
    const thisSunday = nextSunday(addDays(today, -1));
    
    if (isAfterKST(today, thisSunday) || today.getTime() === thisSunday.getTime()) {
      return nextSunday(today);
    }
    
    return thisSunday;
  }
  
  // Sales: 이번 주 또는 다음 주 화요일
  if (trackType === 'sales') {
    const thisTuesday = nextTuesday(addDays(today, -1));
    
    if (isAfterKST(today, thisTuesday) || today.getTime() === thisTuesday.getTime()) {
      return nextTuesday(today);
    }
    
    return thisTuesday;
  }
  
  return today;
}

/**
 * 현재 트랙 타입에 따라 인증 가능한 날짜인지 확인 (KST 기준)
 * 
 * 규칙:
 * 1. 미래 날짜는 인증 불가 (오늘 또는 과거만 가능)
 * 2. 기수 기간 내의 날짜는 모두 인증 가능 (isWithinActivePeriod에서 검증)
 * 3. Short-form: 매일 가능
 * 4. Long-form, Builder, Sales: 기수 기간 내 모든 날짜 가능
 */
export function canCertifyForDate(
  trackType: TrackType,
  targetDate: Date,
  lastCertificationDate?: Date
): boolean {
  const today = toKSTMidnight(getNow());
  const target = toKSTMidnight(targetDate);
  
  // 미래 날짜는 인증 불가 (오늘 또는 과거만 가능)
  if (isAfterKST(target, today)) {
    return false;
  }
  
  // 오늘 또는 과거 날짜는 모두 인증 가능
  // (기수 기간 검증은 isWithinActivePeriod에서 처리)
  return true;
}

/**
 * 기본 인증 날짜 제안 (KST 기준)
 * Short-form: 오늘
 * 주간 트랙: 다음 인증일 (1주일 전이면 다음 인증일, 아니면 오늘)
 */
export function getDefaultCertificationDate(
  trackType: TrackType,
  lastCertificationDate?: Date
): Date {
  const today = toKSTMidnight(getNow());
  
  // Short-form은 항상 오늘
  if (trackType === 'short-form') {
    return today;
  }
  
  // 주간 트랙
  const nextCertDate = getNextCertificationDate(trackType, lastCertificationDate);
  const oneWeekBefore = addDays(nextCertDate, -7);
  
  // 1주일 전이면 다음 인증일 제안, 아니면 오늘
  if (!isAfterKST(oneWeekBefore, today)) {
    return nextCertDate;
  }
  
  return today;
}

/**
 * 트랙 타입별 인증 안내 메시지
 */
export function getCertificationGuideMessage(trackType: TrackType): string {
  switch (trackType) {
    case 'short-form':
      return '매일 꾸준히 인증하여 습관을 만들어보세요! 평일(월~금) 인증이 필요합니다.';
    case 'long-form':
      return '매주 일요일까지 인증해주세요. 일요일 인증분은 일주일 전(지난 월요일)부터 미리 제출할 수 있습니다.';
    case 'builder':
      return '매주 일요일까지 개발 진행 상황을 인증해주세요. 일요일 인증분은 일주일 전부터 미리 제출할 수 있습니다.';
    case 'sales':
      return '매주 화요일까지 판매/고객 개발 내역을 인증해주세요. 화요일 인증분은 일주일 전부터 미리 제출할 수 있습니다.';
    default:
      return '오늘의 챌린지를 인증해주세요.';
  }
}

