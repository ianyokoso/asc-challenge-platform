// 인증 날짜 관련 유틸리티 함수

import { addDays, startOfWeek, nextSunday, nextTuesday, isAfter, startOfDay } from 'date-fns';
import { TrackType } from '../supabase/types';
import { getNow } from './demo-time';

/**
 * 주간 트랙(Long-form, Builder, Sales)의 다음 인증일을 계산
 * 
 * 규칙:
 * - Long-form, Builder: 일요일 마감 (다음 주 일요일)
 * - Sales: 화요일 마감 (다음 주 화요일)
 * - 인증일 1주일 전부터 미리 인증 가능
 * 
 * 예시:
 * - 오늘이 1월 10일(금요일)
 * - 다음 인증일: 1월 12일(일요일)
 * - 5일(일요일) 인증 완료 후 6일(월요일) 00:01부터 12일 인증 가능
 */
export function getNextCertificationDate(trackType: TrackType, lastCertificationDate?: Date): Date {
  const today = startOfDay(getNow());
  
  // Short-form은 매일 인증
  if (trackType === 'short-form') {
    return today;
  }
  
  // 마지막 인증일이 있는 경우
  if (lastCertificationDate) {
    const lastCertDate = startOfDay(lastCertificationDate);
    
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
    const thisSunday = nextSunday(addDays(today, -1)); // 오늘 포함하여 가장 가까운 일요일
    
    // 오늘이 일요일이거나 일요일 이후라면 다음 주 일요일
    if (isAfter(today, thisSunday) || today.getTime() === thisSunday.getTime()) {
      return nextSunday(today);
    }
    
    return thisSunday;
  }
  
  // Sales: 이번 주 또는 다음 주 화요일
  if (trackType === 'sales') {
    const thisTuesday = nextTuesday(addDays(today, -1)); // 오늘 포함하여 가장 가까운 화요일
    
    // 오늘이 화요일이거나 화요일 이후라면 다음 주 화요일
    if (isAfter(today, thisTuesday) || today.getTime() === thisTuesday.getTime()) {
      return nextTuesday(today);
    }
    
    return thisTuesday;
  }
  
  return today;
}

/**
 * 현재 트랙 타입에 따라 인증 가능한 날짜인지 확인
 * 
 * Short-form: 매일 가능
 * Long-form, Builder, Sales: 다음 인증일에 대해 1주일 전부터 가능
 */
export function canCertifyForDate(
  trackType: TrackType,
  targetDate: Date,
  lastCertificationDate?: Date
): boolean {
  const today = startOfDay(getNow());
  const target = startOfDay(targetDate);
  
  // Short-form: 오늘 또는 과거 날짜만 인증 가능
  if (trackType === 'short-form') {
    return !isAfter(target, today);
  }
  
  // 주간 트랙: 다음 인증일 계산
  const nextCertDate = getNextCertificationDate(trackType, lastCertificationDate);
  const oneWeekBefore = addDays(nextCertDate, -7);
  
  // 타겟 날짜가 다음 인증일과 같고, 1주일 전이거나 그 이후면 인증 가능
  if (target.getTime() === nextCertDate.getTime()) {
    return !isAfter(oneWeekBefore, today);
  }
  
  // 과거의 미인증 날짜는 항상 인증 가능
  return isAfter(today, target);
}

/**
 * 기본 인증 날짜 제안
 * Short-form: 오늘
 * 주간 트랙: 다음 인증일 (1주일 전이면 다음 인증일, 아니면 오늘)
 */
export function getDefaultCertificationDate(
  trackType: TrackType,
  lastCertificationDate?: Date
): Date {
  const today = startOfDay(getNow());
  
  // Short-form은 항상 오늘
  if (trackType === 'short-form') {
    return today;
  }
  
  // 주간 트랙
  const nextCertDate = getNextCertificationDate(trackType, lastCertificationDate);
  const oneWeekBefore = addDays(nextCertDate, -7);
  
  // 1주일 전이면 다음 인증일 제안, 아니면 오늘
  if (!isAfter(oneWeekBefore, today)) {
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

