/**
 * 데모 모드 시간 관리 유틸리티
 * 
 * 관리자가 시간을 조작하여 다음날 시나리오를 테스트할 수 있도록 함
 * 실제 시간을 변경하지 않고 가상 시간을 반환
 */

const DEMO_MODE_KEY = 'demo_mode_enabled';
const DEMO_OFFSET_KEY = 'demo_time_offset_days';

/**
 * 데모 모드 활성화 여부 확인
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

/**
 * 데모 모드 활성화/비활성화
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  if (enabled) {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem(DEMO_OFFSET_KEY);
  }
}

/**
 * 데모 시간 오프셋 가져오기 (일 단위)
 */
export function getDemoOffset(): number {
  if (typeof window === 'undefined') return 0;
  const offset = localStorage.getItem(DEMO_OFFSET_KEY);
  return offset ? parseInt(offset, 10) : 0;
}

/**
 * 데모 시간 오프셋 설정 (일 단위)
 */
export function setDemoOffset(days: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_OFFSET_KEY, days.toString());
}

/**
 * 현재 시간 가져오기 (데모 모드 고려)
 * 
 * 데모 모드가 활성화되어 있으면 오프셋이 적용된 가상 시간 반환
 * 그렇지 않으면 실제 현재 시간 반환
 */
export function getNow(): Date {
  const now = new Date();
  
  if (!isDemoMode()) {
    return now;
  }
  
  const offset = getDemoOffset();
  const demoNow = new Date(now);
  demoNow.setDate(demoNow.getDate() + offset);
  
  return demoNow;
}

/**
 * 다음날로 이동
 */
export function addDay(): void {
  const currentOffset = getDemoOffset();
  setDemoOffset(currentOffset + 1);
}

/**
 * 이전날로 이동
 */
export function subtractDay(): void {
  const currentOffset = getDemoOffset();
  setDemoOffset(currentOffset - 1);
}

/**
 * 오늘로 리셋
 */
export function resetToToday(): void {
  setDemoOffset(0);
}

/**
 * N일 후로 이동
 */
export function setDaysFromNow(days: number): void {
  setDemoOffset(days);
}

