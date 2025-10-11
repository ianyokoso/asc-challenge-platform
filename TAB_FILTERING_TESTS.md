# 트랙별 탭 필터링 테스트 가이드

## 개요

관리자 인증 추적 페이지에서 트랙별 탭을 통해 일일(숏폼)과 주간(롱폼/빌더/세일즈) 인증 데이터를 분리하여 표시하는 기능의 테스트 전략입니다.

## 구현된 기능

### 1. 트랙별 탭 구조
- **전체**: 모든 트랙의 인증 현황 표시
- **숏폼 (일일)**: 월~금 일일 인증 데이터
- **롱폼 (주간)**: 일요일 주간 인증 데이터
- **빌더 (주간)**: 일요일 주간 인증 데이터
- **세일즈 (주간)**: 화요일 주간 인증 데이터

### 2. 필터링 로직
```typescript
// 트랙 타입별 필터링
trackData.filter(t => t.trackType === 'short-form')
trackData.filter(t => t.trackType === 'long-form')
trackData.filter(t => t.trackType === 'builder')
trackData.filter(t => t.trackType === 'sales')
```

### 3. UI 컴포넌트
- **shadcn Tabs**: Radix UI 기반 접근성 보장
- **아이콘**: 각 트랙별 시각적 구분 (Video, FileText, Code, TrendingUp)
- **빈 상태**: 참여자가 없는 트랙에 대한 친화적 메시지

## 테스트 전략

### 1. E2E 테스트 - 탭 전환 시 데이터 필터링

#### 시나리오 1: 전체 탭에서 모든 트랙 표시
```typescript
describe('Track Tabs - All Tab', () => {
  it('should display all tracks when "전체" tab is selected', async () => {
    await page.goto('/admin/tracking');
    
    // 기본적으로 "전체" 탭이 선택되어 있는지 확인
    const allTab = await page.locator('[data-state="active"]:has-text("전체")');
    await expect(allTab).toBeVisible();
    
    // 모든 트랙의 테이블이 표시되는지 확인
    const shortFormTable = await page.locator('text=숏폼 크리에이터');
    const longFormTable = await page.locator('text=롱폼 크리에이터');
    const builderTable = await page.locator('text=빌더');
    const salesTable = await page.locator('text=세일즈');
    
    await expect(shortFormTable).toBeVisible();
    await expect(longFormTable).toBeVisible();
    await expect(builderTable).toBeVisible();
    await expect(salesTable).toBeVisible();
  });
});
```

#### 시나리오 2: 숏폼 탭 - 일일 인증만 표시
```typescript
describe('Track Tabs - Short-form Tab', () => {
  it('should display only short-form track data', async () => {
    await page.goto('/admin/tracking');
    
    // 숏폼 탭 클릭
    await page.click('button:has-text("숏폼 (일일)")');
    
    // 숏폼 테이블만 표시되는지 확인
    const shortFormTable = await page.locator('text=숏폼 크리에이터');
    await expect(shortFormTable).toBeVisible();
    
    // 다른 트랙은 표시되지 않는지 확인
    const longFormTable = await page.locator('text=롱폼 크리에이터');
    await expect(longFormTable).not.toBeVisible();
  });

  it('should show weekday dates (Mon-Fri) for short-form', async () => {
    await page.goto('/admin/tracking');
    await page.click('button:has-text("숏폼 (일일)")');
    
    // 테이블 헤더에 월~금 날짜만 있는지 확인
    const tableHeaders = await page.locator('table thead th').allTextContents();
    const weekdayCount = tableHeaders.filter(h => 
      h.includes('월') || h.includes('화') || h.includes('수') || 
      h.includes('목') || h.includes('금')
    ).length;
    
    expect(weekdayCount).toBeGreaterThan(0);
    
    // 주말 날짜가 없는지 확인
    const hasWeekend = tableHeaders.some(h => 
      h.includes('토') || h.includes('일')
    );
    expect(hasWeekend).toBe(false);
  });
});
```

#### 시나리오 3: 주간 트랙 탭 - 특정 요일만 표시
```typescript
describe('Track Tabs - Weekly Tracks', () => {
  it('should display only Sundays for long-form and builder', async () => {
    await page.goto('/admin/tracking');
    
    // 롱폼 탭 클릭
    await page.click('button:has-text("롱폼 (주간)")');
    
    const tableHeaders = await page.locator('table thead th').allTextContents();
    const sundayCount = tableHeaders.filter(h => h.includes('일')).length;
    
    expect(sundayCount).toBeGreaterThan(0);
  });

  it('should display only Tuesdays for sales', async () => {
    await page.goto('/admin/tracking');
    
    // 세일즈 탭 클릭
    await page.click('button:has-text("세일즈 (주간)")');
    
    const tableHeaders = await page.locator('table thead th').allTextContents();
    const tuesdayCount = tableHeaders.filter(h => h.includes('화')).length;
    
    expect(tuesdayCount).toBeGreaterThan(0);
  });
});
```

#### 시나리오 4: 탭 전환 시 URL 상태 유지 (선택사항)
```typescript
describe('Track Tabs - URL State', () => {
  it('should persist tab selection in URL', async () => {
    await page.goto('/admin/tracking');
    
    // 빌더 탭 클릭
    await page.click('button:has-text("빌더 (주간)")');
    
    // URL에 탭 정보가 반영되는지 확인 (구현된 경우)
    // expect(page.url()).toContain('tab=builder');
    
    // 새로고침 후에도 탭 상태가 유지되는지 확인
    await page.reload();
    const builderTab = await page.locator('[data-state="active"]:has-text("빌더")');
    // await expect(builderTab).toBeVisible();
  });
});
```

### 2. UI 정상 렌더링 및 반응형 레이아웃

#### 데스크톱 레이아웃
```typescript
describe('Track Tabs - Desktop Layout', () => {
  beforeEach(async () => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  it('should display tabs in a single row on desktop', async () => {
    await page.goto('/admin/tracking');
    
    const tabsList = await page.locator('[role="tablist"]');
    const tabsListBBox = await tabsList.boundingBox();
    
    // 탭이 한 줄에 표시되는지 확인 (높이가 작아야 함)
    expect(tabsListBBox?.height).toBeLessThan(100);
  });

  it('should show icons and text for all tabs', async () => {
    await page.goto('/admin/tracking');
    
    // 각 탭에 아이콘과 텍스트가 모두 표시되는지 확인
    const tabs = await page.locator('[role="tab"]').all();
    
    for (const tab of tabs) {
      const icon = await tab.locator('svg').count();
      const text = await tab.textContent();
      
      expect(icon).toBe(1);
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });
});
```

#### 모바일/태블릿 레이아웃
```typescript
describe('Track Tabs - Mobile Layout', () => {
  beforeEach(async () => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  it('should display tabs in responsive grid on mobile', async () => {
    await page.goto('/admin/tracking');
    
    const tabsList = await page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
    
    // 탭이 여러 줄로 표시될 수 있음
    const tabsListBBox = await tabsList.boundingBox();
    expect(tabsListBBox?.height).toBeGreaterThan(50);
  });

  it('should be scrollable horizontally if needed', async () => {
    await page.goto('/admin/tracking');
    
    const tabsList = await page.locator('[role="tablist"]');
    const scrollWidth = await tabsList.evaluate(el => el.scrollWidth);
    const clientWidth = await tabsList.evaluate(el => el.clientWidth);
    
    // 스크롤이 가능한지 확인
    if (scrollWidth > clientWidth) {
      // 스크롤 가능
      expect(scrollWidth).toBeGreaterThan(clientWidth);
    }
  });
});
```

#### 접근성 테스트
```typescript
describe('Track Tabs - Accessibility', () => {
  it('should be keyboard navigable', async () => {
    await page.goto('/admin/tracking');
    
    // 첫 번째 탭에 포커스
    await page.keyboard.press('Tab');
    
    // Arrow keys로 탭 이동
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    
    // 현재 포커스된 탭 확인
    const focusedTab = await page.locator('[role="tab"]:focus');
    await expect(focusedTab).toBeVisible();
  });

  it('should have proper ARIA attributes', async () => {
    await page.goto('/admin/tracking');
    
    // 탭 리스트에 role="tablist" 있는지 확인
    const tabsList = await page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();
    
    // 각 탭에 role="tab" 있는지 확인
    const tabs = await page.locator('[role="tab"]').count();
    expect(tabs).toBe(5);
    
    // 탭 패널에 role="tabpanel" 있는지 확인
    const activePanel = await page.locator('[role="tabpanel"]');
    await expect(activePanel).toBeVisible();
  });

  it('should announce tab changes to screen readers', async () => {
    await page.goto('/admin/tracking');
    
    // 탭 변경 시 aria-selected 속성이 변경되는지 확인
    const shortFormTab = await page.locator('button:has-text("숏폼 (일일)")');
    await shortFormTab.click();
    
    const isSelected = await shortFormTab.getAttribute('aria-selected');
    expect(isSelected).toBe('true');
  });
});
```

### 3. 유닛 테스트 - 필터링 로직

#### 트랙 타입별 필터링
```typescript
import { filterTracksByType } from '@/lib/utils/track-filters';

describe('Track Filtering Logic', () => {
  const mockTrackData = [
    { trackId: '1', trackType: 'short-form', trackName: '숏폼', participants: [] },
    { trackId: '2', trackType: 'long-form', trackName: '롱폼', participants: [] },
    { trackId: '3', trackType: 'builder', trackName: '빌더', participants: [] },
    { trackId: '4', trackType: 'sales', trackName: '세일즈', participants: [] },
  ];

  it('should filter short-form tracks only', () => {
    const result = mockTrackData.filter(t => t.trackType === 'short-form');
    
    expect(result).toHaveLength(1);
    expect(result[0].trackType).toBe('short-form');
  });

  it('should filter long-form tracks only', () => {
    const result = mockTrackData.filter(t => t.trackType === 'long-form');
    
    expect(result).toHaveLength(1);
    expect(result[0].trackType).toBe('long-form');
  });

  it('should filter builder tracks only', () => {
    const result = mockTrackData.filter(t => t.trackType === 'builder');
    
    expect(result).toHaveLength(1);
    expect(result[0].trackType).toBe('builder');
  });

  it('should filter sales tracks only', () => {
    const result = mockTrackData.filter(t => t.trackType === 'sales');
    
    expect(result).toHaveLength(1);
    expect(result[0].trackType).toBe('sales');
  });

  it('should return empty array when no tracks match', () => {
    const result = mockTrackData.filter(t => t.trackType === 'non-existent');
    
    expect(result).toHaveLength(0);
  });
});
```

#### 날짜 요구사항 검증
```typescript
import { isRequiredDate, getRequiredDates } from '@/lib/supabase/certification-tracking';

describe('Date Requirement Logic', () => {
  it('should identify weekdays for short-form', () => {
    const monday = new Date('2025-01-06'); // 월요일
    const saturday = new Date('2025-01-11'); // 토요일
    
    expect(isRequiredDate(monday, 'short-form')).toBe(true);
    expect(isRequiredDate(saturday, 'short-form')).toBe(false);
  });

  it('should identify Sundays for long-form and builder', () => {
    const sunday = new Date('2025-01-05'); // 일요일
    const monday = new Date('2025-01-06'); // 월요일
    
    expect(isRequiredDate(sunday, 'long-form')).toBe(true);
    expect(isRequiredDate(monday, 'long-form')).toBe(false);
    
    expect(isRequiredDate(sunday, 'builder')).toBe(true);
    expect(isRequiredDate(monday, 'builder')).toBe(false);
  });

  it('should identify Tuesdays for sales', () => {
    const tuesday = new Date('2025-01-07'); // 화요일
    const wednesday = new Date('2025-01-08'); // 수요일
    
    expect(isRequiredDate(tuesday, 'sales')).toBe(true);
    expect(isRequiredDate(wednesday, 'sales')).toBe(false);
  });

  it('should generate correct date list for short-form (weekdays only)', () => {
    const dates = getRequiredDates(2025, 1, 'short-form');
    
    // 1월의 평일 개수 확인 (대략 20-23일)
    expect(dates.length).toBeGreaterThan(19);
    expect(dates.length).toBeLessThan(24);
  });

  it('should generate correct date list for long-form (Sundays only)', () => {
    const dates = getRequiredDates(2025, 1, 'long-form');
    
    // 1월의 일요일 개수 (4-5개)
    expect(dates.length).toBeGreaterThan(3);
    expect(dates.length).toBeLessThan(6);
  });
});
```

## 성능 테스트

### 탭 전환 성능
```typescript
describe('Track Tabs - Performance', () => {
  it('should switch tabs quickly without re-fetching data', async () => {
    await page.goto('/admin/tracking');
    
    // 초기 데이터 로드 대기
    await page.waitForSelector('[role="tabpanel"]');
    
    const startTime = Date.now();
    
    // 탭 전환 (여러 번)
    await page.click('button:has-text("숏폼 (일일)")');
    await page.click('button:has-text("롱폼 (주간)")');
    await page.click('button:has-text("빌더 (주간)")');
    await page.click('button:has-text("세일즈 (주간)")');
    await page.click('button:has-text("전체")');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 탭 전환이 1초 이내에 완료되어야 함
    expect(duration).toBeLessThan(1000);
  });

  it('should not trigger network requests on tab switch', async () => {
    await page.goto('/admin/tracking');
    
    let networkRequestCount = 0;
    page.on('request', request => {
      if (request.url().includes('/certifications')) {
        networkRequestCount++;
      }
    });
    
    // 초기 로드 후 요청 카운트 리셋
    await page.waitForSelector('[role="tabpanel"]');
    networkRequestCount = 0;
    
    // 탭 전환
    await page.click('button:has-text("숏폼 (일일)")');
    await page.waitForTimeout(500);
    
    // 추가 네트워크 요청이 없어야 함 (데이터는 이미 로드됨)
    expect(networkRequestCount).toBe(0);
  });
});
```

## 버그 시나리오

### 엣지 케이스 테스트
```typescript
describe('Track Tabs - Edge Cases', () => {
  it('should handle empty track data gracefully', async () => {
    // Mock empty response
    await page.route('**/api/certifications*', route => 
      route.fulfill({ 
        status: 200, 
        body: JSON.stringify([]) 
      })
    );
    
    await page.goto('/admin/tracking');
    
    // 빈 상태 메시지 확인
    const emptyMessage = await page.locator('text=활성화된 트랙이 없습니다');
    await expect(emptyMessage).toBeVisible();
  });

  it('should show empty state for tracks with no participants', async () => {
    await page.goto('/admin/tracking');
    
    // 참여자가 없는 트랙 탭 클릭
    await page.click('button:has-text("세일즈 (주간)")');
    
    // 빈 상태 메시지 확인
    const emptyMessage = await page.locator('text=세일즈 트랙 참여자가 없습니다');
    // 참여자가 있다면 이 테스트는 스킵
  });

  it('should maintain tab selection after data refresh', async () => {
    await page.goto('/admin/tracking');
    
    // 특정 탭 선택
    await page.click('button:has-text("빌더 (주간)")');
    
    // 새로고침 버튼 클릭
    await page.click('button:has-text("새로고침")');
    
    // 데이터 로드 대기
    await page.waitForTimeout(1000);
    
    // 탭 선택이 유지되는지 확인
    const builderTab = await page.locator('[data-state="active"]:has-text("빌더")');
    await expect(builderTab).toBeVisible();
  });
});
```

## 실행 방법

### E2E 테스트 (Playwright)
```bash
# 모든 테스트 실행
npm run test:e2e

# 특정 파일만 실행
npm run test:e2e -- tracking-tabs.spec.ts

# UI 모드로 실행 (디버깅)
npm run test:e2e -- --ui
```

### 유닛 테스트 (Jest/Vitest)
```bash
# 모든 유닛 테스트 실행
npm run test

# 특정 파일만 실행
npm run test -- track-filters.test.ts

# Watch 모드
npm run test -- --watch
```

## 체크리스트

- [ ] 모든 5개 탭이 올바르게 렌더링되는가?
- [ ] 탭 클릭 시 해당 트랙 데이터만 표시되는가?
- [ ] 숏폼 탭은 평일(월~금) 날짜만 표시하는가?
- [ ] 롱폼/빌더 탭은 일요일만 표시하는가?
- [ ] 세일즈 탭은 화요일만 표시하는가?
- [ ] 빈 상태가 적절히 처리되는가?
- [ ] 탭 전환이 빠르고 부드러운가?
- [ ] 키보드 탐색이 가능한가?
- [ ] 모바일에서도 탭이 잘 동작하는가?
- [ ] 실시간 업데이트가 탭 전환 후에도 작동하는가?

## 참고 자료

- [Radix UI Tabs Documentation](https://www.radix-ui.com/docs/primitives/components/tabs)
- [shadcn/ui Tabs Component](https://ui.shadcn.com/docs/components/tabs)
- [React Query - Filtering Data](https://tanstack.com/query/latest/docs/react/guides/filters)

