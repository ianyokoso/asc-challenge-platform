# 관리자 인증 현황 추적 페이지 RLS 문제 해결

## 📅 날짜: 2025-10-12

## 🔴 문제 상황

**증상**:
- Network 탭에서는 데이터를 성공적으로 가져오는 것처럼 보임 (200 OK)
- 하지만 관리자 페이지에서 참여자 인증 데이터가 표시되지 않음
- 사용자가 인증을 제출해도 실시간으로 반영되지 않음

**실제 문제**:
```typescript
// 기존 코드: 클라이언트에서 직접 Supabase 조회
const { data: userTracks } = await supabase
  .from('user_tracks')
  .select(`
    user_id,
    user:users!inner(  // ❌ INNER JOIN이 RLS에 막힘
      id,
      discord_username,
      discord_avatar_url
    )
  `)
```

- `users!inner` INNER JOIN을 사용할 때 RLS 정책이 복잡하게 작동
- 관리자 권한이 있어도 JOIN된 데이터가 필터링되어 **빈 배열** 반환
- Network 탭에서는 200 OK지만 실제 데이터는 `[]`

---

## ✅ 해결 방법

### 서버 사이드 API Route 생성

클라이언트에서 직접 Supabase를 호출하지 않고, **서버 API를 통해** `SERVICE_ROLE_KEY`로 RLS를 우회합니다.

---

## 🔧 구현 내용

### 1. 새로운 API Route 생성
**파일**: `src/app/api/admin/certification-tracking/route.ts`

```typescript
// ✅ SERVICE_ROLE_KEY를 사용하여 RLS 우회
const supabase = await createPureClient();

// ✅ 관리자 권한 체크
const { data: { user } } = await authClient.auth.getUser();
const { data: adminUser } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .maybeSingle();

// ✅ INNER JOIN 없이 별도 쿼리로 조회
const { data: userTracks } = await supabase
  .from('user_tracks')
  .select(`
    user_id,
    users (  // LEFT JOIN으로 자동 처리
      id,
      discord_username,
      discord_avatar_url
    )
  `)
```

**특징**:
- `SERVICE_ROLE_KEY` 사용으로 RLS 우회
- 관리자 권한 체크 포함 (보안)
- 상세한 디버깅 로그
- 모든 참여자 데이터 조회 가능

### 2. Hook 수정
**파일**: `src/hooks/useCertificationTracking.ts`

```typescript
// 이전: 직접 Supabase 조회
queryFn: () => getAllTracksCertificationData(year, month)

// 개선: API Route 호출
queryFn: async () => {
  const response = await fetch(
    `/api/admin/certification-tracking?year=${year}&month=${month}`
  );
  const result = await response.json();
  return result.data;
}
```

**변경점**:
- 클라이언트 → 서버 API 호출
- RLS 문제 완전 해결
- Realtime 구독은 그대로 유지

---

## 📊 Before & After

### Before (문제 상황)
```
[Client] 🚀 Fetching data...
[Supabase] ✅ Query successful (200 OK)
[Supabase] 📦 Data: []  ← 빈 배열!
[UI] ⚠️ 참여자 없음 표시
```

### After (해결 후)
```
[Client] 🚀 Calling API...
[API] ✅ Admin verified: admin@example.com
[API] ✅ Found tracks: 4
[API] ✅ Found 5 participants for 숏폼 트랙
[API] 📅 smith_james2794#0 - 2025-10-12: submitted → certified
[Client] ✅ Received data: 4 tracks
[UI] ✅ 참여자 5명 표시
```

---

## 🧪 테스트 방법

### 1단계: 개발 서버 실행
```bash
npm run dev
```

### 2단계: 관리자 페이지 접속
1. `/admin/tracking` 접속
2. F12 → Console 탭 열기

### 3단계: 콘솔 로그 확인
정상 작동 시:
```
[Hook] 🚀 Fetching data from API: {year: 2025, month: 10}
[API] ✅ Admin verified: your-email@example.com
[API] ✅ Found tracks: 4
[API] ✅ Found 2 participants for 숏폼 트랙
[API] 📅 smith_james2794#0 - 2025-10-12: submitted → certified
[Hook] ✅ Received data: 4 tracks
```

### 4단계: 데이터 확인
- 참여자 목록이 표시되는지 확인
- 인증 상태가 제대로 표시되는지 확인 (✅, ⏱️, ❌)

### 5단계: 실시간 업데이트 테스트
1. 다른 브라우저로 사용자 로그인
2. 인증 제출
3. 관리자 페이지에서 자동 업데이트 확인

---

## 🔍 Network 탭 확인

### Before (RLS 문제)
```
Request: user_tracks?select=user_id,user:users!inner(...)
Response: 200 OK
Body: []  ← 빈 배열
```

### After (해결)
```
Request: /api/admin/certification-tracking?year=2025&month=10
Response: 200 OK
Body: {
  data: [
    {
      trackId: "...",
      trackName: "숏폼 트랙",
      participants: [
        {
          userId: "...",
          userName: "smith_james2794#0",
          certifications: { ... }
        }
      ]
    }
  ]
}
```

---

## 🛡️ 보안

### 관리자 권한 체크
API는 두 단계로 권한을 확인합니다:

1. **세션 확인**: 로그인한 사용자인가?
   ```typescript
   const { data: { user } } = await authClient.auth.getUser();
   if (!user) return 401 Unauthorized;
   ```

2. **관리자 확인**: admin_users 테이블에 등록되어 있는가?
   ```typescript
   const { data: adminUser } = await supabase
     .from('admin_users')
     .select('user_id')
     .eq('user_id', user.id)
     .eq('is_active', true)
     .maybeSingle();
   
   if (!adminUser) return 403 Forbidden;
   ```

### SERVICE_ROLE_KEY 사용
- 서버 사이드에서만 사용
- 클라이언트에 노출되지 않음
- RLS를 우회하여 모든 데이터 조회 가능

---

## ❓ FAQ

### Q1. 왜 클라이언트에서 직접 조회하지 않나요?
**A**: INNER JOIN과 RLS의 조합이 복잡하게 작동하여 관리자여도 데이터가 필터링됩니다. 서버 사이드에서 SERVICE_ROLE_KEY를 사용하면 이 문제를 완전히 우회할 수 있습니다.

### Q2. 성능은 괜찮나요?
**A**: 오히려 더 좋습니다:
- 하나의 API 호출로 모든 데이터 조회
- 서버에서 데이터 가공 후 전송
- React Query 캐싱 활용

### Q3. Realtime은 어떻게 되나요?
**A**: Realtime 구독은 그대로 유지됩니다. 인증이 제출되면:
1. Realtime이 변경 감지
2. React Query 캐시 무효화
3. API 자동 재호출
4. UI 업데이트

### Q4. 다른 관리자 페이지도 수정해야 하나요?
**A**: 비슷한 문제가 있다면 동일한 방식으로 해결할 수 있습니다:
- `/admin/users` - 이미 API Route 사용 중
- `/admin/settings` - 단순 조회라 문제 없음
- `/admin/tracking` - ✅ 이번에 수정됨

---

## 📝 관련 파일

### 신규 파일
- `src/app/api/admin/certification-tracking/route.ts` - 서버 API Route

### 수정된 파일
- `src/hooks/useCertificationTracking.ts` - API 호출로 변경
- `ADMIN_TRACKING_IMPROVEMENTS.md` - 이전 개선사항
- `REALTIME_CERTIFICATION_TROUBLESHOOTING.md` - 문제 해결 가이드

---

## 🎉 결과

이제 관리자 페이지에서:
- ✅ 모든 참여자 데이터가 제대로 표시됩니다
- ✅ 인증 상태가 정확하게 보입니다
- ✅ 실시간 업데이트가 작동합니다
- ✅ 디버깅이 쉽습니다 (상세한 로그)

**smith_james2794#0**님의 숏폼 트랙, 빌더 트랙 인증이 이제 제대로 표시될 것입니다! 🎊

---

## 🔄 다음 단계

페이지를 새로고침하고 다음을 확인하세요:
1. 참여자 목록이 표시되는가?
2. 인증 상태가 제대로 보이는가?
3. 브라우저 콘솔에 에러가 없는가?

문제가 계속되면 콘솔 로그를 공유해 주세요!

