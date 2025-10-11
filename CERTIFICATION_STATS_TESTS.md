# 인증 통계 계산 테스트 가이드

## 개요

참여자별 달성도(완료율) 및 미이행 횟수를 계산하여 테이블에 표시하는 기능의 테스트 전략입니다.

## 구현된 기능

### 1. 미이행 횟수 계산
- 각 참여자별로 `status === 'missing'` 인 날짜 카운팅
- 미이행 비율 계산 (`미이행 횟수 / 전체 필요 인증 횟수 * 100`)

### 2. 시각적 표시
- **0회**: 녹색 텍스트로 표시
- **1회 이상**: 빨간색 텍스트 + 미이행 비율(%) 표시

### 3. 테이블 레이아웃
- 완료율 열 다음에 "미이행" 열 추가
- 고정 너비 (100px) 유지

## 테스트 전략

### 1. 유닛 테스트 - 미이행 횟수 계산 로직

#### 기본 계산 테스트
```typescript
import { countMissingCertifications } from '@/lib/utils/certification-stats';

describe('countMissingCertifications', () => {
  it('should count missing certifications correctly', () => {
    const certifications = {
      '2025-01-01': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-01' },
      '2025-01-02': { status: 'missing', url: null, submittedAt: null },
      '2025-01-03': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-03' },
      '2025-01-04': { status: 'missing', url: null, submittedAt: null },
      '2025-01-05': { status: 'pending', url: 'https://example.com', submittedAt: '2025-01-05' },
    };

    const result = countMissingCertifications(certifications);
    
    expect(result).toBe(2);
  });

  it('should return 0 when no missing certifications', () => {
    const certifications = {
      '2025-01-01': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-01' },
      '2025-01-02': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-02' },
      '2025-01-03': { status: 'pending', url: 'https://example.com', submittedAt: '2025-01-03' },
    };

    const result = countMissingCertifications(certifications);
    
    expect(result).toBe(0);
  });

  it('should return total count when all are missing', () => {
    const certifications = {
      '2025-01-01': { status: 'missing', url: null, submittedAt: null },
      '2025-01-02': { status: 'missing', url: null, submittedAt: null },
      '2025-01-03': { status: 'missing', url: null, submittedAt: null },
      '2025-01-04': { status: 'missing', url: null, submittedAt: null },
      '2025-01-05': { status: 'missing', url: null, submittedAt: null },
    };

    const result = countMissingCertifications(certifications);
    
    expect(result).toBe(5);
  });

  it('should ignore not-required certifications', () => {
    const certifications = {
      '2025-01-01': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-01' },
      '2025-01-02': { status: 'not-required', url: null, submittedAt: null },
      '2025-01-03': { status: 'missing', url: null, submittedAt: null },
      '2025-01-04': { status: 'not-required', url: null, submittedAt: null },
    };

    const result = countMissingCertifications(certifications);
    
    // not-required는 카운트하지 않음
    expect(result).toBe(1);
  });
});
```

#### 엣지 케이스 테스트
```typescript
describe('countMissingCertifications - Edge Cases', () => {
  it('should handle empty certifications object', () => {
    const certifications = {};

    const result = countMissingCertifications(certifications);
    
    expect(result).toBe(0);
  });

  it('should handle undefined certifications', () => {
    const result = countMissingCertifications(undefined);
    
    expect(result).toBe(0);
  });

  it('should handle null certifications', () => {
    const result = countMissingCertifications(null);
    
    expect(result).toBe(0);
  });

  it('should handle large number of certifications', () => {
    const certifications: any = {};
    
    // 365일치 인증 데이터 생성 (반절은 missing)
    for (let i = 1; i <= 365; i++) {
      const date = `2025-${String(Math.floor(i / 31) + 1).padStart(2, '0')}-${String((i % 31) + 1).padStart(2, '0')}`;
      certifications[date] = {
        status: i % 2 === 0 ? 'missing' : 'certified',
        url: i % 2 === 0 ? null : 'https://example.com',
        submittedAt: i % 2 === 0 ? null : date,
      };
    }

    const result = countMissingCertifications(certifications);
    
    expect(result).toBe(182); // 365 / 2 = 182.5 (반올림)
  });
});
```

### 2. 통합 테스트 - 컴포넌트 렌더링

#### 기본 렌더링 테스트
```typescript
import { render, screen } from '@testing-library/react';
import { CertificationTrackingTable } from '@/components/admin/CertificationTrackingTable';

describe('CertificationTrackingTable - Missing Count Column', () => {
  const mockData = {
    trackId: 'track-1',
    trackName: '숏폼 크리에이터',
    trackType: 'short-form',
    dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
    participants: [
      {
        userId: 'user-1',
        userName: '김철수',
        userAvatar: null,
        certifications: {
          '2025-01-01': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-01' },
          '2025-01-02': { status: 'missing', url: null, submittedAt: null },
          '2025-01-03': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-03' },
        },
        totalCertified: 2,
        totalRequired: 3,
        completionRate: 67,
      },
      {
        userId: 'user-2',
        userName: '이영희',
        userAvatar: null,
        certifications: {
          '2025-01-01': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-01' },
          '2025-01-02': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-02' },
          '2025-01-03': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-03' },
        },
        totalCertified: 3,
        totalRequired: 3,
        completionRate: 100,
      },
    ],
  };

  it('should render missing count column header', () => {
    render(<CertificationTrackingTable data={mockData} />);
    
    expect(screen.getByText('미이행')).toBeInTheDocument();
  });

  it('should display correct missing count for each participant', () => {
    render(<CertificationTrackingTable data={mockData} />);
    
    // 김철수: 1회 미이행
    const kimRow = screen.getByText('김철수').closest('tr');
    expect(kimRow).toHaveTextContent('1회');
    
    // 이영희: 0회 미이행
    const leeRow = screen.getByText('이영희').closest('tr');
    expect(leeRow).toHaveTextContent('0회');
  });

  it('should display percentage for users with missing certifications', () => {
    render(<CertificationTrackingTable data={mockData} />);
    
    // 김철수: 1/3 = 33%
    const kimRow = screen.getByText('김철수').closest('tr');
    expect(kimRow).toHaveTextContent('(33%)');
  });

  it('should not display percentage for users with 0 missing', () => {
    render(<CertificationTrackingTable data={mockData} />);
    
    // 이영희: 0회이므로 퍼센티지 없음
    const leeRow = screen.getByText('이영희').closest('tr');
    expect(leeRow).not.toHaveTextContent('%');
  });

  it('should apply green color for 0 missing count', () => {
    const { container } = render(<CertificationTrackingTable data={mockData} />);
    
    const leeRow = screen.getByText('이영희').closest('tr');
    const missingCell = leeRow?.querySelector('td:nth-child(3)'); // 3번째 열 (미이행)
    
    expect(missingCell?.querySelector('span')).toHaveClass('text-green-600');
  });

  it('should apply red color for non-zero missing count', () => {
    const { container } = render(<CertificationTrackingTable data={mockData} />);
    
    const kimRow = screen.getByText('김철수').closest('tr');
    const missingCell = kimRow?.querySelector('td:nth-child(3)'); // 3번째 열 (미이행)
    
    expect(missingCell?.querySelector('span')).toHaveClass('text-red-600');
  });
});
```

#### 엣지 케이스 - 통합 테스트
```typescript
describe('CertificationTrackingTable - Missing Count Edge Cases', () => {
  it('should handle 100% missing rate correctly', () => {
    const mockData = {
      trackId: 'track-1',
      trackName: '숏폼 크리에이터',
      trackType: 'short-form',
      dates: ['2025-01-01', '2025-01-02', '2025-01-03'],
      participants: [
        {
          userId: 'user-1',
          userName: '박민수',
          userAvatar: null,
          certifications: {
            '2025-01-01': { status: 'missing', url: null, submittedAt: null },
            '2025-01-02': { status: 'missing', url: null, submittedAt: null },
            '2025-01-03': { status: 'missing', url: null, submittedAt: null },
          },
          totalCertified: 0,
          totalRequired: 3,
          completionRate: 0,
        },
      ],
    };

    render(<CertificationTrackingTable data={mockData} />);
    
    const parkRow = screen.getByText('박민수').closest('tr');
    expect(parkRow).toHaveTextContent('3회');
    expect(parkRow).toHaveTextContent('(100%)');
  });

  it('should handle no participants gracefully', () => {
    const mockData = {
      trackId: 'track-1',
      trackName: '숏폼 크리에이터',
      trackType: 'short-form',
      dates: ['2025-01-01', '2025-01-02'],
      participants: [],
    };

    render(<CertificationTrackingTable data={mockData} />);
    
    // 빈 상태 메시지 표시
    expect(screen.getByText(/참여하는 사용자가 없습니다/)).toBeInTheDocument();
  });

  it('should handle mixed certification statuses', () => {
    const mockData = {
      trackId: 'track-1',
      trackName: '숏폼 크리에이터',
      trackType: 'short-form',
      dates: ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'],
      participants: [
        {
          userId: 'user-1',
          userName: '최지현',
          userAvatar: null,
          certifications: {
            '2025-01-01': { status: 'certified', url: 'https://example.com', submittedAt: '2025-01-01' },
            '2025-01-02': { status: 'pending', url: 'https://example.com', submittedAt: '2025-01-02' },
            '2025-01-03': { status: 'missing', url: null, submittedAt: null },
            '2025-01-04': { status: 'not-required', url: null, submittedAt: null },
            '2025-01-05': { status: 'missing', url: null, submittedAt: null },
          },
          totalCertified: 1,
          totalRequired: 4, // not-required 제외
          completionRate: 25,
        },
      ],
    };

    render(<CertificationTrackingTable data={mockData} />);
    
    const choiRow = screen.getByText('최지현').closest('tr');
    
    // missing만 카운트 (certified, pending, not-required 제외)
    expect(choiRow).toHaveTextContent('2회');
    
    // 2 / 4 = 50%
    expect(choiRow).toHaveTextContent('(50%)');
  });
});
```

### 3. E2E 테스트 - 실제 사용자 시나리오

```typescript
import { test, expect } from '@playwright/test';

test.describe('Certification Tracking - Missing Count Column', () => {
  test.beforeEach(async ({ page }) => {
    // 관리자로 로그인
    await page.goto('/login');
    await page.click('button:has-text("Discord로 시작하기")');
    // ... Discord OAuth 인증 ...
    
    // 인증 추적 페이지로 이동
    await page.goto('/admin/tracking');
    await page.waitForSelector('table');
  });

  test('should display missing count for all participants', async ({ page }) => {
    // 테이블이 로드될 때까지 대기
    await page.waitForSelector('thead th:has-text("미이행")');
    
    // 미이행 열이 표시되는지 확인
    const missingHeader = await page.locator('thead th:has-text("미이행")');
    await expect(missingHeader).toBeVisible();
    
    // 각 참여자의 미이행 횟수가 표시되는지 확인
    const rows = await page.locator('tbody tr').all();
    
    for (const row of rows) {
      const missingCell = await row.locator('td').nth(2); // 3번째 열
      const text = await missingCell.textContent();
      
      // "X회" 형식으로 표시되는지 확인
      expect(text).toMatch(/\d+회/);
    }
  });

  test('should update missing count in real-time when certification is submitted', async ({ page }) => {
    // 특정 사용자의 미이행 횟수 확인
    const userRow = page.locator('tr:has-text("김철수")');
    const initialMissingCount = await userRow.locator('td').nth(2).textContent();
    
    console.log('Initial missing count:', initialMissingCount);
    
    // 인증 제출 시뮬레이션 (다른 탭에서 인증 제출)
    // ... Supabase Realtime으로 자동 업데이트 ...
    
    // 미이행 횟수가 감소했는지 확인
    await page.waitForTimeout(2000); // Realtime 업데이트 대기
    
    const updatedMissingCount = await userRow.locator('td').nth(2).textContent();
    console.log('Updated missing count:', updatedMissingCount);
    
    // 값이 변경되었는지 확인
    expect(updatedMissingCount).not.toBe(initialMissingCount);
  });

  test('should show correct color for missing count', async ({ page }) => {
    // 미이행 0회인 사용자 찾기
    const perfectRow = page.locator('tr:has-text("0회")').first();
    const perfectMissingCell = perfectRow.locator('td').nth(2);
    
    // 녹색 텍스트 확인
    await expect(perfectMissingCell.locator('span').first()).toHaveClass(/text-green-600/);
    
    // 미이행 1회 이상인 사용자 찾기
    const missingRow = page.locator('tbody tr').filter({
      has: page.locator('td:has-text("회")').filter({
        hasNot: page.locator(':has-text("0회")')
      })
    }).first();
    
    if (await missingRow.count() > 0) {
      const missingCell = missingRow.locator('td').nth(2);
      
      // 빨간색 텍스트 확인
      await expect(missingCell.locator('span').first()).toHaveClass(/text-red-600/);
      
      // 퍼센티지 표시 확인
      await expect(missingCell).toContainText('%');
    }
  });

  test('should calculate percentage correctly', async ({ page }) => {
    // 특정 사용자의 완료율 및 미이행 정보 확인
    const userRow = page.locator('tr:has-text("이영희")').first();
    
    // 완료율 추출
    const completionText = await userRow.locator('td').nth(1).textContent();
    const completionRate = parseInt(completionText?.match(/(\d+)%/)?.[1] || '0');
    
    // 미이행 횟수 및 비율 추출
    const missingText = await userRow.locator('td').nth(2).textContent();
    const missingCount = parseInt(missingText?.match(/(\d+)회/)?.[1] || '0');
    const missingPercentage = parseInt(missingText?.match(/\((\d+)%\)/)?.[1] || '0');
    
    // 완료율 + 미이행율 <= 100% (pending 상태가 있을 수 있음)
    expect(completionRate + missingPercentage).toBeLessThanOrEqual(100);
  });
});
```

### 4. 성능 테스트

```typescript
describe('CertificationTrackingTable - Performance', () => {
  it('should calculate missing count efficiently for large dataset', () => {
    // 100명의 참여자, 30일치 데이터
    const participants = Array.from({ length: 100 }, (_, i) => ({
      userId: `user-${i}`,
      userName: `User ${i}`,
      userAvatar: null,
      certifications: Object.fromEntries(
        Array.from({ length: 30 }, (_, j) => [
          `2025-01-${String(j + 1).padStart(2, '0')}`,
          {
            status: Math.random() > 0.7 ? 'missing' : 'certified',
            url: Math.random() > 0.7 ? null : 'https://example.com',
            submittedAt: Math.random() > 0.7 ? null : `2025-01-${String(j + 1).padStart(2, '0')}`,
          },
        ])
      ),
      totalCertified: 20,
      totalRequired: 30,
      completionRate: 67,
    }));

    const mockData = {
      trackId: 'track-1',
      trackName: '숏폼 크리에이터',
      trackType: 'short-form',
      dates: Array.from({ length: 30 }, (_, i) => `2025-01-${String(i + 1).padStart(2, '0')}`),
      participants,
    };

    const startTime = performance.now();
    render(<CertificationTrackingTable data={mockData} />);
    const endTime = performance.now();

    // 렌더링이 500ms 이내에 완료되어야 함
    expect(endTime - startTime).toBeLessThan(500);
  });

  it('should not cause memory leaks with large datasets', () => {
    // 메모리 사용량 측정
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    // 대량 데이터로 렌더링 및 언마운트 반복
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<CertificationTrackingTable data={mockLargeData} />);
      unmount();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // 메모리 증가량이 10MB 이하여야 함
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## 실행 방법

### 유닛 테스트
```bash
# 모든 유닛 테스트 실행
npm run test

# 특정 파일만 실행
npm run test -- certification-stats.test.ts

# Watch 모드
npm run test -- --watch
```

### 통합 테스트
```bash
# 컴포넌트 통합 테스트
npm run test -- CertificationTrackingTable.test.tsx
```

### E2E 테스트
```bash
# Playwright E2E 테스트
npm run test:e2e

# UI 모드
npm run test:e2e -- --ui
```

## 체크리스트

- [ ] 미이행 횟수가 정확하게 계산되는가?
- [ ] 미이행 비율(%)이 올바르게 표시되는가?
- [ ] 0회일 때 녹색, 1회 이상일 때 빨간색으로 표시되는가?
- [ ] 테이블 열이 올바른 위치(완료율 다음)에 표시되는가?
- [ ] 엣지 케이스(전부 성공, 전부 실패)가 올바르게 처리되는가?
- [ ] 실시간 업데이트 시 미이행 횟수가 자동으로 갱신되는가?
- [ ] 대량 데이터에서도 성능 문제가 없는가?
- [ ] 반응형 디자인이 올바르게 작동하는가?

## 참고 자료

- [JavaScript Array.filter()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
- [Lodash countBy](https://lodash.com/docs/#countBy)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright E2E Testing](https://playwright.dev/docs/intro)

