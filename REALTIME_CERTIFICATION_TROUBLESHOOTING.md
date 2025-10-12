# 인증 현황 추적 페이지 실시간 연동 문제 해결 가이드

## 문제 증상

관리자 페이지(`/admin/tracking`)에서 사용자가 인증을 제출해도 실시간으로 반영되지 않는 문제

## 최근 개선 사항 (2025-10-12)

### 1. 디버깅 로그 추가
- 인증 데이터 조회 과정에서 상세한 콘솔 로그 추가
- Realtime 구독 상태 변화를 실시간으로 확인 가능
- 각 사용자별 인증 상태 변환 로직 로깅

### 2. Realtime 연결 상태 표시
- UI에 Realtime 연결 상태 뱃지 추가
  - ✅ **연결됨**: 정상 작동 중
  - ⏳ **연결 중**: Realtime 서버에 연결 시도 중
  - ❌ **연결 오류**: Realtime 연결 실패
  - 🔌 **연결 끊김**: Realtime 연결이 끊어짐

### 3. 인증 상태 판단 로직 개선
기존:
```typescript
status: cert.status === 'approved' || cert.status === 'submitted' ? 'certified' : 'pending'
```

개선:
```typescript
const certStatus = (cert.status === 'approved' || cert.status === 'submitted') 
  ? 'certified' 
  : (cert.status === 'rejected' ? 'missing' : 'pending');
```

- `rejected` 상태를 명시적으로 `missing`으로 처리
- 더 명확한 상태 분류

## 문제 해결 단계

### 1단계: Supabase Realtime 활성화 확인

#### Supabase Dashboard에서 확인:
1. [Supabase Dashboard](https://supabase.com/dashboard)에 접속
2. 프로젝트 선택
3. **Database** → **Replication** 메뉴로 이동
4. `certifications` 테이블의 **Realtime**이 활성화되어 있는지 확인

#### SQL로 확인:
```sql
SELECT 
  schemaname, 
  tablename, 
  pg_class.oid::regclass::text AS table_full_name,
  (
    SELECT array_agg(pubname) 
    FROM pg_publication_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'certifications'
  ) AS publications
FROM pg_tables 
JOIN pg_class ON pg_class.relname = tablename
WHERE schemaname = 'public' 
AND tablename = 'certifications';
```

#### Realtime 활성화 (비활성화된 경우):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE certifications;
```

### 2단계: RLS 정책 확인

관리자가 모든 인증을 조회할 수 있는지 확인:

```sql
-- 관리자 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'certifications' 
AND policyname LIKE '%admin%';

-- 결과에 다음 정책이 있어야 함:
-- "Admins can view all certifications"
```

### 3단계: 브라우저 콘솔 로그 확인

관리자 페이지에 접속한 후 브라우저 개발자 도구(F12)의 **Console** 탭에서 다음 로그를 확인:

#### 정상 연결 시 로그:
```
[Realtime] 📡 Setting up certification tracking subscription
[Realtime] 📊 Subscription status changed: SUBSCRIBED
[Realtime] ✅ Successfully subscribed to certification changes
[getAllTracksCertificationData] 🚀 Fetching data for: {year: 2025, month: 10}
[getAllTracksCertificationData] ✅ Found tracks: 4
[getAllTracksCertificationData] ✅ Fetched X certifications for [트랙명]
```

#### 인증 제출 시 로그:
```
[Realtime] ✅ Certification change detected: {
  eventType: 'INSERT',
  table: 'certifications',
  data: {...},
  timestamp: '2025-10-12T...'
}
```

### 4단계: 수동 테스트

1. **인증 제출 테스트**:
   - 사용자 계정으로 로그인
   - `/certify/[trackType]` 페이지에서 인증 제출
   - 관리자 페이지로 돌아가서 변경사항 확인

2. **새로고침 버튼 사용**:
   - Realtime이 작동하지 않더라도 수동으로 데이터 갱신 가능
   - 오른쪽 상단의 "새로고침" 버튼 클릭

### 5단계: 환경 변수 확인

`.env.local` 파일에 Supabase URL과 Anon Key가 올바르게 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 일반적인 문제와 해결책

### 문제 1: Realtime이 계속 "연결 중" 상태

**원인**:
- Supabase Realtime이 프로젝트에서 활성화되지 않음
- 방화벽이 WebSocket 연결을 차단

**해결**:
1. Supabase Dashboard에서 Realtime 활성화
2. 네트워크 방화벽 설정 확인
3. 브라우저를 새로고침

### 문제 2: 인증이 "미인증"으로 표시됨

**원인**:
- 인증 상태가 `rejected` 또는 잘못된 값
- RLS 정책으로 인해 데이터를 조회할 수 없음

**해결**:
1. 데이터베이스에서 해당 인증의 `status` 컬럼 확인:
```sql
SELECT 
  u.discord_username,
  c.certification_date,
  c.status,
  c.certification_url
FROM certifications c
JOIN users u ON u.id = c.user_id
WHERE c.certification_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY c.created_at DESC;
```

2. 상태가 `pending`인 경우, 수동으로 `submitted`로 변경:
```sql
UPDATE certifications
SET status = 'submitted'
WHERE id = 'certification-id';
```

### 문제 3: 특정 사용자의 인증만 보이지 않음

**원인**:
- 해당 사용자가 트랙에 제대로 배정되지 않음
- `user_tracks` 테이블의 `is_active`가 `false`

**해결**:
```sql
-- 사용자 트랙 상태 확인
SELECT 
  u.discord_username,
  t.name AS track_name,
  ut.is_active
FROM user_tracks ut
JOIN users u ON u.id = ut.user_id
JOIN tracks t ON t.id = ut.track_id
WHERE u.discord_username = '사용자명';

-- 활성화
UPDATE user_tracks
SET is_active = true
WHERE user_id = 'user-id' AND track_id = 'track-id';
```

### 문제 4: 과거 날짜 인증이 표시되지 않음

**원인**:
- 인증 날짜가 해당 월의 범위를 벗어남
- 인증이 실제로 제출되지 않음

**해결**:
1. 페이지 상단의 월 선택을 변경하여 해당 인증이 있는 월로 이동
2. 데이터베이스에서 직접 확인:
```sql
SELECT * FROM certifications
WHERE user_id = 'user-id'
AND track_id = 'track-id'
ORDER BY certification_date DESC;
```

## 성능 최적화

### Realtime 구독 최적화

현재 구현은 `certifications` 테이블의 **모든 변경사항**을 감지합니다. 
대규모 사용자 환경에서는 필터를 추가하는 것이 좋습니다:

```typescript
// 특정 월의 인증만 감지
const channel = supabase
  .channel(`certification-tracking-${year}-${month}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'certifications',
      filter: `certification_date=gte.${startDate},certification_date=lte.${endDate}`,
    },
    (payload) => {
      // ... 처리 로직
    }
  )
  .subscribe();
```

## 추가 디버깅 도구

### 1. Realtime Inspector (Supabase Dashboard)

Supabase Dashboard → **Database** → **Replication** → **Real-time Inspector**에서 실시간 이벤트를 모니터링할 수 있습니다.

### 2. 네트워크 탭 확인

브라우저 개발자 도구 → **Network** 탭:
- WebSocket 연결 확인 (`wss://`)
- Realtime 메시지 흐름 확인

## 문의

추가 문제가 발생하면:
1. 브라우저 콘솔 로그 전체를 캡처
2. Realtime 연결 상태 스크린샷
3. 인증 데이터 쿼리 결과 (민감 정보 제외)

위 정보를 Discord 관리자 채널에 공유해 주세요.

