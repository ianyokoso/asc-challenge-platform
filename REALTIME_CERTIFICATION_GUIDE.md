# 실시간 인증 추적 시스템 가이드

## 개요

ASC 챌린지 플랫폼의 관리자 페이지에 Supabase Realtime을 통합하여 인증 현황을 실시간으로 추적하고 자동 갱신하는 시스템입니다.

## 구현 세부사항

### 1. Supabase Realtime 통합 (`src/hooks/useCertificationTracking.ts`)

#### 주요 기능
- **실시간 데이터 구독**: `certifications` 테이블의 INSERT, UPDATE, DELETE 이벤트 구독
- **자동 UI 갱신**: 데이터 변경 시 React Query의 `invalidateQueries`를 통한 자동 refetch
- **효율적인 캐싱**: React Query의 stale-time 및 caching 전략 활용

#### 코드 구조

```typescript
export function useAllTracksCertificationData(year: number, month: number) {
  const queryClient = useQueryClient();
  
  // 1. React Query로 데이터 fetch
  const query = useQuery({
    queryKey: ['certification-tracking', 'all-tracks', year, month],
    queryFn: () => getAllTracksCertificationData(year, month),
    staleTime: 1000 * 60 * 2, // 2분
    refetchOnWindowFocus: true,
  });

  // 2. Supabase Realtime 구독 설정
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`certification-tracking-${year}-${month}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'certifications',
      }, (payload) => {
        // 데이터 변경 감지 → 쿼리 무효화 → 자동 refetch
        queryClient.invalidateQueries({
          queryKey: ['certification-tracking', 'all-tracks', year, month],
        });
      })
      .subscribe();

    // 3. Cleanup on unmount
    return () => supabase.removeChannel(channel);
  }, [year, month, queryClient]);

  return query;
}
```

### 2. date-fns를 활용한 날짜 처리

#### 인증 날짜 포맷팅
```typescript
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

// 월별 날짜 범위 생성
const startDate = startOfMonth(new Date(year, month - 1));
const endDate = endOfMonth(new Date(year, month - 1));
const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

// 한국어 포맷팅
const formattedDate = format(new Date(), 'yyyy년 M월 d일', { locale: ko });
```

#### 데드라인 비교 로직
```typescript
import { isAfter, isBefore, parseISO } from 'date-fns';

// 인증 제출 기한 체크
const certificationDate = parseISO(certification.certified_at);
const deadline = endOfMonth(new Date(year, month - 1));

const isOnTime = isBefore(certificationDate, deadline) || 
                 isEqual(certificationDate, deadline);
```

### 3. UI 상태 표시 (`src/app/admin/tracking/page.tsx`)

#### 실시간 연결 상태 Badge
```tsx
<Badge 
  variant="outline" 
  className="flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200"
>
  <Wifi className="h-3.5 w-3.5" />
  <span className="text-xs">실시간 연결됨</span>
</Badge>
```

## 테스트 전략

### 1. 실시간 UI 업데이트 테스트 (E2E)

#### 테스트 시나리오
```typescript
describe('Realtime Certification Tracking', () => {
  it('should update UI when certification is submitted', async () => {
    // 1. 관리자 페이지 로드
    await page.goto('/admin/tracking');
    
    // 2. 초기 데이터 확인
    const initialCompletionRate = await page.textContent('[data-testid="completion-rate"]');
    
    // 3. 다른 브라우저/탭에서 인증 제출
    await submitCertification(userId, trackId, certificationUrl);
    
    // 4. 실시간 업데이트 대기 (최대 3초)
    await page.waitForTimeout(3000);
    
    // 5. UI가 자동 갱신되었는지 확인
    const updatedCompletionRate = await page.textContent('[data-testid="completion-rate"]');
    expect(updatedCompletionRate).not.toBe(initialCompletionRate);
  });

  it('should show realtime connection status', async () => {
    await page.goto('/admin/tracking');
    
    // 실시간 연결 배지 확인
    const badge = await page.locator('text=실시간 연결됨');
    await expect(badge).toBeVisible();
  });
});
```

### 2. API 오류 및 네트워크 지연 테스트

#### 로딩 상태 테스트
```typescript
describe('Loading and Error States', () => {
  it('should show loading spinner while fetching data', async () => {
    // 네트워크 지연 시뮬레이션
    await page.route('**/rest/v1/certifications*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/admin/tracking');
    
    // 로딩 스피너 확인
    const loader = await page.locator('[data-testid="loading-spinner"]');
    await expect(loader).toBeVisible();
  });

  it('should display error message on API failure', async () => {
    // API 오류 시뮬레이션
    await page.route('**/rest/v1/certifications*', route => 
      route.abort('failed')
    );

    await page.goto('/admin/tracking');
    
    // 에러 메시지 확인
    const errorMessage = await page.locator('text=데이터 로드 실패');
    await expect(errorMessage).toBeVisible();
  });

  it('should allow retry after error', async () => {
    let requestCount = 0;
    
    await page.route('**/rest/v1/certifications*', route => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/tracking');
    
    // "다시 시도" 버튼 클릭
    await page.click('button:has-text("다시 시도")');
    
    // 성공적으로 데이터 로드 확인
    const table = await page.locator('[data-testid="certification-table"]');
    await expect(table).toBeVisible();
  });
});
```

### 3. 유닛 테스트 - 데이터 파싱 및 상태 로직

#### 날짜 파싱 테스트
```typescript
import { parseCertificationDate, isWithinDeadline } from '@/lib/utils/certification';

describe('Date Parsing and Validation', () => {
  it('should correctly parse ISO date strings', () => {
    const isoDate = '2025-01-15T10:30:00Z';
    const parsed = parseCertificationDate(isoDate);
    
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(0); // 0-indexed
    expect(parsed.getDate()).toBe(15);
  });

  it('should validate certification deadline', () => {
    const certDate = new Date('2025-01-25');
    const deadline = new Date('2025-01-31');
    
    expect(isWithinDeadline(certDate, deadline)).toBe(true);
  });

  it('should reject late certifications', () => {
    const certDate = new Date('2025-02-01');
    const deadline = new Date('2025-01-31');
    
    expect(isWithinDeadline(certDate, deadline)).toBe(false);
  });
});
```

#### 완료율 계산 테스트
```typescript
import { calculateCompletionRate } from '@/lib/utils/certification';

describe('Completion Rate Calculation', () => {
  it('should calculate correct completion percentage', () => {
    const certified = 15;
    const required = 20;
    
    const rate = calculateCompletionRate(certified, required);
    
    expect(rate).toBe(75); // 15/20 * 100 = 75%
  });

  it('should handle 100% completion', () => {
    const rate = calculateCompletionRate(20, 20);
    expect(rate).toBe(100);
  });

  it('should handle zero required certifications', () => {
    const rate = calculateCompletionRate(0, 0);
    expect(rate).toBe(0);
  });
});
```

#### Realtime 구독 테스트
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAllTracksCertificationData } from '@/hooks/useCertificationTracking';

describe('Realtime Subscription Hook', () => {
  it('should subscribe to certification changes on mount', () => {
    const { result } = renderHook(() => 
      useAllTracksCertificationData(2025, 1)
    );
    
    // 구독 상태 확인 (콘솔 로그 모니터링)
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Setting up certification tracking subscription')
    );
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => 
      useAllTracksCertificationData(2025, 1)
    );
    
    unmount();
    
    // 구독 해제 확인
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Unsubscribing from certification tracking')
    );
  });

  it('should refetch data when certification changes', async () => {
    const { result } = renderHook(() => 
      useAllTracksCertificationData(2025, 1)
    );
    
    // 초기 데이터 로드 대기
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    const initialData = result.current.data;
    
    // Realtime 이벤트 시뮬레이션 (Supabase channel trigger)
    // ...실제 구현에서는 Supabase mock 필요
    
    // 데이터 갱신 확인
    await waitFor(() => expect(result.current.data).not.toBe(initialData));
  });
});
```

## 성능 최적화

### 1. 쿼리 캐싱 전략
- **staleTime**: 2분 (데이터가 fresh한 시간)
- **refetchOnWindowFocus**: 창 포커스 시 자동 갱신
- **Realtime 우선**: 변경 감지 시 즉시 무효화

### 2. 구독 최적화
- 월/연도별 독립적인 채널 사용
- 컴포넌트 언마운트 시 자동 구독 해제
- 중복 구독 방지

### 3. UI 렌더링 최적화
- React Query의 자동 중복 제거
- 필요한 쿼리만 무효화
- 낙관적 업데이트 지원 (향후 확장 가능)

## 디버깅 가이드

### 콘솔 로그 모니터링
```
[Realtime] 📡 Setting up certification tracking subscription { year: 2025, month: 1 }
[Realtime] ✅ Successfully subscribed to certification changes
[Realtime] ✅ Certification change detected: { eventType: 'INSERT', ... }
[Realtime] 🔌 Unsubscribing from certification tracking
```

### 일반적인 문제 해결

#### 1. 실시간 업데이트가 작동하지 않음
- Supabase 프로젝트에서 Realtime이 활성화되어 있는지 확인
- 브라우저 콘솔에서 `[Realtime]` 로그 확인
- 네트워크 탭에서 WebSocket 연결 상태 확인

#### 2. 데이터가 중복으로 로드됨
- React Query의 `staleTime` 조정
- 쿼리 키가 올바르게 설정되었는지 확인

#### 3. 메모리 누수
- `useEffect` cleanup 함수가 제대로 실행되는지 확인
- 채널 구독이 올바르게 해제되는지 확인

## 향후 개선 사항

1. **낙관적 업데이트**: 서버 응답 전에 UI를 즉시 업데이트
2. **부분 업데이트**: 전체 refetch 대신 변경된 데이터만 업데이트
3. **오프라인 지원**: 네트워크 연결이 끊겼을 때 대응
4. **알림 시스템**: 중요한 변경사항에 대한 토스트 알림

## 참고 자료

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [React Query Documentation](https://tanstack.com/query/latest)
- [date-fns Documentation](https://date-fns.org/)

