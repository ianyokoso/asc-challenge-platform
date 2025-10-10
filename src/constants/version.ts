/**
 * 애플리케이션 버전 관리
 * 
 * 버전 형식: MAJOR.MINOR.PATCH
 * - MAJOR: 주요 기능 변경 또는 호환성 깨짐
 * - MINOR: 새로운 기능 추가
 * - PATCH: 버그 수정 및 작은 개선
 */

export const APP_VERSION = '1.2.4';

export const VERSION_HISTORY = [
  {
    version: '1.2.4',
    date: '2025-10-10',
    changes: [
      '로그인 과정 상세 디버깅 추가',
      '사용자 세션 상태 추적 강화',
      '로그인 실패 원인 분석 개선',
      'OAuth 플로우 디버깅 로그 추가',
    ],
  },
  {
    version: '1.2.0',
    date: '2025-10-10',
    changes: [
      '코드 리팩토링 (컴포넌트 분리)',
      '관리자 기능 모듈화',
      '커스텀 훅 추출',
      '상수 관리 개선',
    ],
  },
  {
    version: '1.1.0',
    date: '2025-10-10',
    changes: [
      '관리자 트랙 배정 기능 추가',
      '트랙 배정 Dialog 구현',
      '관리 버튼 활성화',
      '새 사용자 트랙 선택 제한',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-10-10',
    changes: [
      '초기 출시',
      'Discord OAuth2 인증',
      '4가지 트랙 시스템',
      '관리자 페이지',
    ],
  },
] as const;

export function getLatestVersion() {
  return VERSION_HISTORY[0];
}

export function getVersionInfo() {
  return {
    current: APP_VERSION,
    latest: getLatestVersion(),
    history: VERSION_HISTORY,
  };
}

