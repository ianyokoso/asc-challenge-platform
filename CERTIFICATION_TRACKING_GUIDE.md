# 📊 트랙별 인증 현황 대시보드

## 개요
관리자가 모든 참여자의 일일 인증 현황을 한눈에 파악할 수 있는 구글 시트 스타일의 대시보드입니다.

## 주요 기능

### 1. 📅 **날짜별 인증 현황**
- 월별 캘린더 뷰
- 평일/주말 자동 필터링 (숏폼 트랙)
- 날짜별 열로 표시

### 2. 👥 **참여자별 인증 상태**
- 사용자 이름 및 프로필 사진
- 참여 중인 트랙별로 행 분리
- 고정된 왼쪽 열 (스크롤 시 유지)

### 3. 🎯 **인증 상태 시각화**
| 상태 | 아이콘 | 색상 | 의미 |
|------|--------|------|------|
| ✅ 승인됨 | CheckCircle2 | 초록색 | 관리자가 인증 승인 |
| 🕒 제출됨 | Clock | 파란색 | 사용자가 인증 제출 |
| ⏳ 대기중 | AlertCircle | 노란색 | 인증 검토 대기 |
| ❌ 거부됨 | XCircle | 빨간색 | 관리자가 인증 거부 |
| ⚪ 미인증 | Circle | 회색 | 인증 미제출 |

### 4. 🔍 **필터링 및 정렬**
- **트랙 필터**: 전체 트랙 / 숏폼 / 롱폼 / 빌더 / 세일즈
- **정렬 옵션**:
  - 이름순 (가나다순)
  - 완료율순 (높은 순)

### 5. 📈 **통계 정보**

- 전체 참여자 수
- 총 인증 가능 일수
- 평균 완료율
- 트랙별 세부 통계:
  - 승인/제출/미인증 건수
  - 완료율 (%)

### 6. 📥 **데이터 내보내기**
- CSV 내보내기 (구현 예정)
- 엑셀 호환 형식

## 사용 방법

### 접근 경로
```
관리자 페이지 → 사이드바 → 인증 현황
또는
/admin/tracking
```

### 월 변경
- 좌측/우측 화살표 버튼으로 이전/다음 달 조회
- 현재 월이 기본 표시

### 인증 상세 확인
- 인증 상태 아이콘 클릭 시 인증 URL로 이동 (새 창)

### 완료율 확인
- 각 행의 맨 오른쪽에 완료율 표시
- 색상 코딩:
  - 80% 이상: 초록색
  - 50-79%: 노란색
  - 50% 미만: 빨간색

## 기술 스택

### Frontend
- **React + TypeScript**: 타입 안전성
- **Tailwind CSS**: 유틸리티 스타일링
- **shadcn/ui**: UI 컴포넌트
- **lucide-react**: 아이콘
- **date-fns**: 날짜 처리

### Backend
- **Supabase**: 데이터베이스 쿼리
- **React Query**: 서버 상태 관리
  - 2분 캐싱
  - 5분 자동 갱신

### 주요 컴포넌트

```typescript
// 인증 현황 테이블
<CertificationTrackingTable
  data={matrixData}
  selectedMonth={selectedMonth}
  onMonthChange={setSelectedMonth}
  onRefresh={() => refetchMatrix()}
/>
```

### API 함수

```typescript
// 특정 기간의 인증 현황 매트릭스
getCertificationMatrix(
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  trackId?: string
)

// 현재 월의 인증 현황
getCurrentMonthCertificationMatrix(trackId?: string)

// 통계 계산
calculateCertificationStats(matrix)
```

## 데이터 구조

### CertificationMatrix
```typescript
{
  dates: ['2025-01-01', '2025-01-02', ...], // 날짜 배열
  users: [
    {
      id: 'user-uuid',
      discord_username: 'user#1234',
      discord_avatar_url: 'https://...',
      tracks: {
        'track-uuid': {
          track_name: '숏폼',
          certifications: {
            '2025-01-01': {
              status: 'approved',
              url: 'https://...',
              id: 'cert-uuid'
            },
            '2025-01-02': null, // 미인증
            ...
          }
        }
      }
    },
    ...
  ],
  tracks: [
    { id: 'track-uuid', name: '숏폼', type: 'shortform' },
    ...
  ]
}
```

## 성능 최적화

### 1. 데이터베이스 쿼리 최적화
- 인덱스 활용 (`idx_certifications_date`, `idx_certifications_user_id`)
- 필요한 데이터만 선택 (SELECT 최소화)
- 날짜 범위 필터링 (GTE, LTE)

### 2. 클라이언트 캐싱
- React Query로 2분 캐싱
- 5분마다 백그라운드 갱신
- 수동 새로고침 버튼

### 3. 렌더링 최적화
- `useMemo`로 필터링/정렬 결과 메모이제이션
- 가상 스크롤 (대량 데이터 시 고려)

## 접근성 (a11y)

### 키보드 내비게이션
- Tab으로 셀 이동
- Enter로 인증 URL 열기
- 화살표 키로 테이블 내비게이션

### 스크린 리더
- `scope` 속성으로 헤더 셀 지정
- `aria-label`로 상태 설명
- 테이블 구조 명확화

### 색상 대비
- WCAG AA 기준 충족
- 색상 외 아이콘으로도 구분 가능

## 테스트 시나리오

### 1. 빈 데이터
```typescript
// 신규 트랙 또는 참여자 없음
expect(table).toContainText('데이터가 없습니다');
```

### 2. 최대 데이터
```typescript
// 100명 참여자 × 31일 × 4트랙 = 12,400개 셀
// 렌더링 시간 < 1초
// 스크롤 성능 60fps 유지
```

### 3. 실제 데이터 (중간 규모)
```typescript
// 30명 참여자 × 20일(평일) × 2트랙 = 1,200개 셀
// 완료율 계산 정확성 검증
```

### 4. 필터링 및 정렬
```typescript
// 트랙 필터: 숏폼만 → 숏폼 참여자만 표시
// 정렬: 완료율순 → 높은 순으로 정렬
```

### 5. 상태 변화
```typescript
// 인증 제출 → 테이블에 즉시 반영
// 관리자 승인 → 아이콘 변경 (Clock → CheckCircle2)
```

## 향후 계획

### Phase 2
- [ ] CSV/Excel 내보내기 구현
- [ ] 인증 상세 팝업 (클릭 시)
- [ ] 관리자 인증 승인/거부 기능
- [ ] 일괄 인증 처리

### Phase 3
- [ ] 실시간 업데이트 (WebSocket)
- [ ] 차트 시각화 (트렌드 분석)
- [ ] 알림 기능 (미인증 알림)
- [ ] 사용자 필터 (검색)

### Phase 4
- [ ] 모바일 최적화
- [ ] 다크 모드
- [ ] 커스텀 날짜 범위
- [ ] 인쇄 최적화

## 문제 해결

### Q: 데이터가 표시되지 않아요
**A**: 다음을 확인하세요:
1. 관리자 권한이 있는지
2. 해당 월에 참여자가 있는지
3. 네트워크 연결 상태
4. 브라우저 콘솔 에러 메시지

### Q: 느린 로딩 속도
**A**: 다음을 시도하세요:
1. 트랙 필터 사용 (전체 → 특정 트랙)
2. 브라우저 캐시 클리어
3. 새로고침 버튼 클릭

### Q: 인증 상태가 업데이트 안돼요
**A**: 
1. 새로고침 버튼 클릭
2. 5분 대기 (자동 갱신)
3. 페이지 새로고침 (F5)

## 기여 가이드

### 코드 수정
```typescript
// src/lib/supabase/certification-tracking.ts
// 데이터 로직

// src/components/admin/CertificationTrackingTable.tsx
// UI 컴포넌트

// src/hooks/useCertificationTracking.ts
// React Query 훅
```

### 테스트 추가
```typescript
// __tests__/admin/certification-tracking.test.tsx
describe('CertificationTrackingTable', () => {
  it('빈 데이터 처리', () => {
    // ...
  });
  
  it('정렬 기능', () => {
    // ...
  });
});
```

## 라이센스
MIT License

---

**마지막 업데이트**: 2025-01-11  
**버전**: 1.6.0  
**작성자**: ASC Challenge Platform Team

