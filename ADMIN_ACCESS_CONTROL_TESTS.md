# 관리자 접근 제어 테스트 가이드 (T-004)

## 📋 개요

이 문서는 T-004 "관리자만 대시보드 및 리셋 기능 접근 가능" 작업의 테스트 전략 및 검증 항목을 설명합니다.

## 🎯 테스트 목표

1. **관리자 인증**: 관리자만 관리자 페이지와 API에 접근 가능
2. **비관리자 차단**: 일반 사용자의 관리자 페이지/API 접근 차단
3. **세션 보안**: 서버 사이드와 클라이언트 사이드 모두에서 권한 확인
4. **RLS 정책**: Supabase RLS가 올바르게 적용되는지 확인
5. **에러 핸들링**: 권한 실패 시 적절한 리다이렉션 및 메시지 표시

---

## 🔐 1. Supabase RLS 정책 테스트

### 1.1. `admin_users` 테이블 RLS 확인

**테스트 쿼리:**
```sql
-- 일반 사용자로 admin_users 테이블 접근 시도 (차단되어야 함)
SELECT * FROM admin_users;
-- 결과: 빈 배열 또는 권한 에러

-- is_admin RPC 함수로 관리자 확인 (SECURITY DEFINER로 RLS 우회)
SELECT is_admin('YOUR_USER_ID');
-- 관리자: true, 비관리자: false
```

**검증 항목:**
- [ ] 일반 사용자는 `admin_users` 테이블에 직접 접근 불가
- [ ] `is_admin()` RPC 함수는 모든 인증된 사용자가 호출 가능
- [ ] `is_admin()` 함수는 `SECURITY DEFINER`로 RLS를 우회하여 정확한 결과 반환

### 1.2. 관리자 전용 RPC 함수 테스트

**테스트 쿼리:**
```sql
-- 관리자로 로그인 후
SELECT * FROM get_admin_users();
-- 결과: 관리자 목록 반환

-- 일반 사용자로 로그인 후
SELECT * FROM get_admin_users();
-- 결과: Unauthorized 에러
```

**검증 항목:**
- [ ] `get_admin_users()` 함수는 관리자만 호출 가능
- [ ] 비관리자 호출 시 명확한 에러 메시지 반환

---

## 🌐 2. API 라우트 권한 테스트

### 2.1. `/api/admin/check` - 관리자 권한 확인 API

**테스트 시나리오:**

| 시나리오 | 사용자 | 예상 응답 | 상태 코드 |
|---------|-------|----------|----------|
| 로그인 안 함 | 없음 | `{ isAdmin: false, userId: null, error: "Not authenticated" }` | 401 |
| 일반 사용자 | 비관리자 | `{ isAdmin: false, userId: "USER_ID" }` | 200 |
| 관리자 | 관리자 | `{ isAdmin: true, userId: "ADMIN_ID" }` | 200 |

**테스트 방법:**
```bash
# 1. 로그인하지 않은 상태
curl https://your-app.vercel.app/api/admin/check

# 2. 일반 사용자로 로그인 후 (브라우저 쿠키 포함)
curl -X GET https://your-app.vercel.app/api/admin/check \
  -H "Cookie: YOUR_SESSION_COOKIE"

# 3. 관리자로 로그인 후
curl -X GET https://your-app.vercel.app/api/admin/check \
  -H "Cookie: ADMIN_SESSION_COOKIE"
```

**검증 항목:**
- [ ] 미인증 사용자: 401 에러 반환
- [ ] 일반 사용자: `isAdmin: false` 반환
- [ ] 관리자: `isAdmin: true` 반환

### 2.2. `/api/admin/users` - 사용자 목록 조회 API

**테스트 시나리오:**

| 시나리오 | 사용자 | 예상 응답 | 상태 코드 |
|---------|-------|----------|----------|
| 로그인 안 함 | 없음 | `{ error: "Unauthorized: Not authenticated" }` | 401 |
| 일반 사용자 | 비관리자 | `{ error: "Forbidden: Admin access required" }` | 403 |
| 관리자 | 관리자 | `{ users: [...], count: N }` | 200 |

**검증 항목:**
- [ ] 미인증 사용자: 401 에러
- [ ] 일반 사용자: 403 Forbidden 에러
- [ ] 관리자: 사용자 목록과 트랙 정보 반환

### 2.3. `/api/admin/stats` - 관리자 통계 API

**테스트 시나리오:**

| 시나리오 | 사용자 | 예상 응답 | 상태 코드 |
|---------|-------|----------|----------|
| 로그인 안 함 | 없음 | `{ error: "Unauthorized: Not authenticated" }` | 401 |
| 일반 사용자 | 비관리자 | `{ error: "Forbidden: Admin access required" }` | 403 |
| 관리자 | 관리자 | `{ stats: { totalUsers, todayCertifications, dropoutCandidates } }` | 200 |

**검증 항목:**
- [ ] 미인증 사용자: 401 에러
- [ ] 일반 사용자: 403 Forbidden 에러
- [ ] 관리자: 정확한 통계 데이터 반환

---

## 🔒 3. Next.js 미들웨어 테스트

### 3.1. `/admin/*` 경로 접근 제어

**테스트 시나리오:**

| 시나리오 | 사용자 | 접근 경로 | 예상 동작 |
|---------|-------|----------|----------|
| 로그인 안 함 | 없음 | `/admin` | `/login?error=로그인이 필요합니다&redirect=/admin` 으로 리다이렉션 |
| 일반 사용자 | 비관리자 | `/admin/users` | `/?error=관리자만 접근할 수 있습니다` 으로 리다이렉션 |
| 관리자 | 관리자 | `/admin/settings` | 페이지 정상 렌더링 |

**테스트 방법:**
```bash
# 1. 로그인하지 않고 /admin 접근
# 브라우저에서: https://your-app.vercel.app/admin
# 예상: /login 페이지로 리다이렉션 + 에러 메시지

# 2. 일반 사용자로 로그인 후 /admin/users 접근
# 예상: 홈페이지로 리다이렉션 + 에러 토스트

# 3. 관리자로 로그인 후 /admin 접근
# 예상: 관리자 대시보드 페이지 정상 렌더링
```

**검증 항목:**
- [ ] 미인증 사용자: 로그인 페이지로 리다이렉션 (redirect 파라미터 포함)
- [ ] 일반 사용자: 홈페이지로 리다이렉션 (에러 메시지 포함)
- [ ] 관리자: 페이지 정상 접근
- [ ] 리다이렉션 시 적절한 에러 메시지 전달

---

## 🛡️ 4. 클라이언트 사이드 가드 컴포넌트 테스트

### 4.1. `AdminPageGuard` 컴포넌트 테스트

**테스트 시나리오:**

| 시나리오 | 사용자 상태 | 예상 UI | 리다이렉션 |
|---------|-----------|---------|----------|
| 로딩 중 | - | 로딩 스피너 + "권한을 확인하는 중..." | 없음 |
| 로그인 안 함 | `user: null` | "로그인이 필요합니다" 카드 + 로그인 버튼 | `/login` |
| 일반 사용자 | `isAdmin: false` | "접근 권한 없음" 카드 + 홈 버튼 | `/` |
| 관리자 | `isAdmin: true` | 자식 컴포넌트 렌더링 | 없음 |

**테스트 방법:**
```tsx
// 1. AdminPageGuard로 감싼 관리자 페이지 생성
// src/app/admin/test/page.tsx
import { AdminPageGuard } from '@/components/guards/AdminPageGuard';

export default function AdminTestPage() {
  return (
    <AdminPageGuard>
      <div>
        <h1>관리자 전용 페이지</h1>
        <p>이 페이지는 관리자만 볼 수 있습니다.</p>
      </div>
    </AdminPageGuard>
  );
}

// 2. 브라우저에서 /admin/test 접근
// - 로그인 안 함: "로그인이 필요합니다" UI 표시
// - 일반 사용자: "접근 권한 없음" UI 표시
// - 관리자: "관리자 전용 페이지" 콘텐츠 표시
```

**검증 항목:**
- [ ] 로딩 중: 적절한 로딩 UI 표시
- [ ] 미인증: "로그인이 필요합니다" 메시지 + 로그인 버튼
- [ ] 비관리자: "접근 권한 없음" 메시지 + 홈 버튼
- [ ] 관리자: 보호된 콘텐츠 정상 렌더링
- [ ] 권한 확인 중 에러 발생 시 적절한 토스트 메시지

---

## 🧪 5. 통합 테스트 시나리오

### 5.1. 일반 사용자 플로우

**시나리오:**
1. 일반 사용자가 로그인
2. 브라우저 주소창에 `/admin` 입력
3. 미들웨어가 권한 체크
4. 홈페이지로 리다이렉션 + 에러 메시지 표시
5. 직접 `/api/admin/users` API 호출 시도
6. 403 Forbidden 에러 반환

**검증 항목:**
- [ ] 1단계 (미들웨어): `/admin` 접근 차단
- [ ] 2단계 (클라이언트 가드): 컴포넌트 레벨 차단
- [ ] 3단계 (API 라우트): API 레벨 차단
- [ ] 모든 단계에서 명확한 에러 메시지 제공

### 5.2. 관리자 플로우

**시나리오:**
1. 관리자가 로그인
2. `/admin` 페이지 접근
3. 미들웨어 권한 확인 통과
4. `AdminPageGuard` 권한 확인 통과
5. 관리자 대시보드 정상 렌더링
6. `/api/admin/users` API 호출
7. 사용자 목록 정상 반환

**검증 항목:**
- [ ] 미들웨어 통과
- [ ] 클라이언트 가드 통과
- [ ] API 호출 성공
- [ ] 모든 관리자 기능 정상 작동

### 5.3. 세션 만료 시나리오

**시나리오:**
1. 관리자로 로그인
2. 관리자 페이지에서 작업 중
3. 세션이 만료됨
4. API 요청 시 401 에러
5. 로그인 페이지로 자동 리다이렉션

**검증 항목:**
- [ ] 세션 만료 감지
- [ ] 적절한 에러 메시지
- [ ] 로그인 페이지로 리다이렉션
- [ ] 리다이렉션 후 원래 페이지로 복귀 가능

---

## 📊 6. 수동 테스트 체크리스트

### 6.1. 브라우저 테스트

- [ ] **Chrome (데스크톱)**
  - [ ] 미인증 사용자가 `/admin` 접근 시 로그인 페이지로 리다이렉션
  - [ ] 일반 사용자가 `/admin` 접근 시 홈페이지로 리다이렉션
  - [ ] 관리자가 `/admin` 정상 접근
  - [ ] 개발자 도구 콘솔에 적절한 로그 출력

- [ ] **Firefox (데스크톱)**
  - [ ] 동일한 테스트 반복

- [ ] **Safari (Mac/iOS)**
  - [ ] 동일한 테스트 반복

- [ ] **Edge (데스크톱)**
  - [ ] 동일한 테스트 반복

### 6.2. 모바일 테스트

- [ ] **Chrome Mobile (Android)**
  - [ ] 미들웨어 리다이렉션 정상 작동
  - [ ] 에러 메시지가 모바일에서 잘 보임

- [ ] **Safari Mobile (iOS)**
  - [ ] 동일한 테스트 반복

### 6.3. 네트워크 조건 테스트

- [ ] **느린 3G 네트워크**
  - [ ] 권한 체크 중 로딩 UI 정상 표시
  - [ ] 타임아웃 없이 정상 작동

- [ ] **오프라인**
  - [ ] 적절한 에러 메시지 표시

---

## 🐛 7. 알려진 문제 및 해결 방법

### 7.1. RLS 무한 루프 문제

**문제:**
`is_admin()` RPC 함수 내에서 `admin_users` 테이블을 조회할 때, RLS 정책이 다시 `is_admin()`을 호출하여 무한 루프 발생.

**해결:**
`is_admin()` 함수를 `SECURITY DEFINER`로 선언하여 RLS를 우회하도록 수정.

```sql
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
-- ...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2. 미들웨어에서 쿠키 접근 불가

**문제:**
Next.js 미들웨어에서 `cookies()` 함수가 제대로 작동하지 않음.

**해결:**
`request.cookies.getAll()`을 직접 사용하여 쿠키 가져오기.

---

## ✅ 8. 테스트 통과 기준

### 8.1. 필수 통과 항목

- [x] Supabase RLS 정책이 올바르게 적용됨
- [x] 관리자 전용 API 라우트가 비관리자 접근을 차단함
- [x] Next.js 미들웨어가 서버 사이드에서 권한 체크함
- [x] `AdminPageGuard` 컴포넌트가 클라이언트 사이드에서 권한 체크함
- [x] 권한 실패 시 적절한 리다이렉션 및 에러 메시지 표시
- [ ] 모든 브라우저에서 정상 작동
- [ ] 모바일에서 정상 작동
- [ ] 느린 네트워크에서도 안정적으로 작동

### 8.2. 선택 통과 항목

- [ ] 세션 만료 시 자동 리다이렉션
- [ ] 권한 체크 성능 최적화 (캐싱)
- [ ] 관리자 권한 변경 시 실시간 반영
- [ ] 로그인 후 원래 페이지로 자동 복귀

---

## 🚀 9. 배포 전 최종 체크리스트

- [ ] 모든 RLS 정책이 프로덕션 Supabase에 적용됨
- [ ] 환경 변수가 Vercel에 올바르게 설정됨
- [ ] 관리자 계정이 `admin_users` 테이블에 등록됨
- [ ] 프로덕션 환경에서 수동 테스트 완료
- [ ] 에러 로그 모니터링 설정 완료
- [ ] 사용자에게 관리자 페이지 접근 방법 안내 완료

---

## 📝 10. 테스트 로그 예시

### 10.1. 성공 로그

```
[Middleware] Admin access granted for user: a1b2c3d4-...
[AdminPageGuard] Admin check result: true
[Admin Check API] ✅ isAdmin: true, userId: a1b2c3d4-...
```

### 10.2. 실패 로그 (예상됨)

```
[Middleware] Non-admin user tried to access admin page: x9y8z7w6-...
[AdminPageGuard] User is not admin, redirecting to home
[Admin Users API] Access denied: { userId: 'x9y8z7w6-...', isAdmin: false }
```

---

## 📞 문의 및 지원

테스트 중 문제가 발생하면 다음을 확인하세요:

1. **Supabase 로그**: Dashboard > Logs > API
2. **Vercel 로그**: Deployment > Functions > Logs
3. **브라우저 콘솔**: 클라이언트 사이드 에러 확인
4. **네트워크 탭**: API 응답 상태 코드 확인

---

**작성일**: 2025-10-11  
**버전**: 1.0  
**작업 코드**: T-004
