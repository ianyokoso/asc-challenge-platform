# 관리자 접근 제어 테스트 문서

## 개요
ASC 챌린지 플랫폼의 관리자 전용 기능에 대한 접근 제어 테스트 시나리오입니다.

## 테스트 환경
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Discord OAuth2 + Supabase Auth
- **State Management**: @tanstack/react-query
- **Security Layer**: Row Level Security (RLS) + Server-side checks

---

## 1. 관리자 권한 확인 테스트

### 1.1 관리자 계정 로그인
**테스트 ID**: `ADMIN-001`  
**목적**: 관리자 계정이 정상적으로 인증되는지 확인

**전제 조건**:
- Supabase `admin_users` 테이블에 등록된 관리자 계정 존재
- Discord OAuth2 설정 완료

**테스트 단계**:
1. `/login` 페이지 접속
2. "Discord로 시작하기" 버튼 클릭
3. Discord OAuth2 인증 완료
4. 애플리케이션으로 리다이렉트

**기대 결과**:
- ✅ 로그인 성공
- ✅ `/certify` 페이지로 리다이렉트
- ✅ Navbar에 "관리" 링크 표시
- ✅ 콘솔에 `[isUserAdmin] Admin check result: true` 로그 출력

**SQL 확인 쿼리**:
```sql
-- 관리자 계정 확인
SELECT * FROM public.admin_users 
WHERE user_id = '<user_id>' AND is_active = true;
```

---

### 1.2 비관리자 계정 로그인
**테스트 ID**: `ADMIN-002`  
**목적**: 비관리자 계정이 관리자 기능에 접근할 수 없는지 확인

**전제 조건**:
- `admin_users` 테이블에 등록되지 않은 일반 사용자 계정

**테스트 단계**:
1. 비관리자 계정으로 로그인
2. Navbar 확인

**기대 결과**:
- ✅ 로그인 성공
- ✅ Navbar에 "관리" 링크 **표시되지 않음**
- ✅ 콘솔에 `[isUserAdmin] Admin check result: false` 로그 출력

---

## 2. 관리자 페이지 접근 테스트

### 2.1 관리자의 대시보드 접근
**테스트 ID**: `ADMIN-003`  
**목적**: 관리자가 대시보드에 정상적으로 접근할 수 있는지 확인

**테스트 단계**:
1. 관리자 계정으로 로그인
2. Navbar의 "관리" 링크 클릭 (또는 `/admin` 직접 접속)

**기대 결과**:
- ✅ 관리자 대시보드 렌더링
- ✅ 통계 정보 표시 (전체 참가자, 오늘 인증, 탈락 후보)
- ✅ AdminSidebar 표시
- ✅ 콘솔에 권한 확인 성공 로그

---

### 2.2 비관리자의 대시보드 접근 시도
**테스트 ID**: `ADMIN-004`  
**목적**: 비관리자가 관리자 페이지에 접근 시 차단되는지 확인

**테스트 단계**:
1. 비관리자 계정으로 로그인
2. 브라우저 주소창에 `/admin` 직접 입력

**기대 결과**:
- ✅ 대시보드 **렌더링되지 않음**
- ✅ "접근 권한이 없습니다" Toast 메시지 표시
- ✅ 홈 페이지(`/`)로 자동 리다이렉트
- ✅ 콘솔에 `[AdminDashboard] User is not admin, redirecting to home` 로그

---

### 2.3 미로그인 상태에서 대시보드 접근 시도
**테스트 ID**: `ADMIN-005`  
**목적**: 로그인하지 않은 사용자가 관리자 페이지 접근 시 차단되는지 확인

**테스트 단계**:
1. 로그아웃 상태 확인
2. `/admin` 페이지 직접 접속

**기대 결과**:
- ✅ "로그인이 필요합니다" Toast 메시지 표시
- ✅ `/login` 페이지로 자동 리다이렉트
- ✅ 콘솔에 `[AdminDashboard] No user found, redirecting to login` 로그

---

## 3. API 라우트 보호 테스트

### 3.1 관리자 API 호출 (인증됨)
**테스트 ID**: `ADMIN-006`  
**목적**: 관리자 계정이 보호된 API를 호출할 수 있는지 확인

**테스트 단계**:
1. 관리자 계정으로 로그인
2. 브라우저 개발자 도구 콘솔에서 API 호출:
```javascript
fetch('/api/admin/stats', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

**기대 결과**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 10,
    "todayCertifications": 5,
    "dropoutCandidates": 2
  },
  "timestamp": "2025-01-10T..."
}
```
- ✅ HTTP 200 응답
- ✅ 통계 데이터 정상 반환

---

### 3.2 비관리자 API 호출 시도
**테스트 ID**: `ADMIN-007`  
**목적**: 비관리자가 보호된 API 호출 시 차단되는지 확인

**테스트 단계**:
1. 비관리자 계정으로 로그인
2. 브라우저 개발자 도구 콘솔에서 API 호출:
```javascript
fetch('/api/admin/stats', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

**기대 결과**:
```json
{
  "error": "권한이 없습니다",
  "code": "FORBIDDEN",
  "message": "관리자만 접근할 수 있습니다.",
  "userId": "<user_id>"
}
```
- ✅ HTTP 403 Forbidden 응답
- ✅ 데이터 반환 **안 됨**

---

### 3.3 미인증 API 호출 시도
**테스트 ID**: `ADMIN-008`  
**목적**: 로그인하지 않은 상태에서 API 호출 시 차단되는지 확인

**테스트 단계**:
1. 로그아웃 상태
2. API 호출 시도

**기대 결과**:
```json
{
  "error": "인증이 필요합니다",
  "code": "UNAUTHORIZED",
  "message": "로그인 후 다시 시도해주세요."
}
```
- ✅ HTTP 401 Unauthorized 응답

---

## 4. Supabase RLS 정책 테스트

### 4.1 관리자 - 모든 사용자 조회
**테스트 ID**: `ADMIN-009`  
**목적**: 관리자가 RLS를 통해 모든 사용자 데이터를 조회할 수 있는지 확인

**Supabase SQL Editor에서 실행** (관리자 user_id로 `auth.uid()` 설정):
```sql
-- 관리자로 설정
SELECT set_config('request.jwt.claim.sub', '<admin_user_id>', true);

-- 모든 사용자 조회 시도
SELECT * FROM public.users;
```

**기대 결과**:
- ✅ 모든 사용자 레코드 반환
- ✅ RLS 정책 통과

---

### 4.2 비관리자 - 타인 사용자 조회 시도
**테스트 ID**: `ADMIN-010`  
**목적**: 비관리자가 다른 사용자의 데이터를 조회할 수 없는지 확인

**Supabase SQL Editor에서 실행** (비관리자 user_id로 설정):
```sql
-- 비관리자로 설정
SELECT set_config('request.jwt.claim.sub', '<non_admin_user_id>', true);

-- 모든 사용자 조회 시도
SELECT * FROM public.users;
```

**기대 결과**:
- ✅ 자신의 레코드만 반환
- ✅ 타인의 데이터 **반환되지 않음**

---

### 4.3 user_tracks 테이블 관리자 권한
**테스트 ID**: `ADMIN-011`  
**목적**: 관리자만 user_tracks를 수정/삭제할 수 있는지 확인

**테스트 단계**:
1. 관리자 계정으로 `/admin/users` 접속
2. 사용자의 "관리" 버튼 클릭
3. 트랙 배정 변경 (추가/제거)
4. 저장

**기대 결과**:
- ✅ 트랙 배정 성공
- ✅ "트랙 배정 완료" Toast 표시
- ✅ 사용자 트랙 목록 업데이트

**SQL 확인**:
```sql
SELECT * FROM public.user_tracks WHERE user_id = '<target_user_id>';
```

---

### 4.4 비관리자 user_tracks 수정 시도
**테스트 ID**: `ADMIN-012`  
**목적**: 비관리자가 RLS를 우회하여 트랙을 수정할 수 없는지 확인

**SQL 직접 실행 시도** (비관리자 user_id로):
```sql
SELECT set_config('request.jwt.claim.sub', '<non_admin_user_id>', true);

-- 다른 사용자의 트랙 삭제 시도
DELETE FROM public.user_tracks 
WHERE user_id != '<non_admin_user_id>';
```

**기대 결과**:
- ✅ RLS 정책으로 인해 삭제 **차단됨**
- ✅ `0 rows affected` 또는 Permission denied 에러

---

## 5. 엣지 케이스 테스트

### 5.1 관리자 계정 비활성화
**테스트 ID**: `ADMIN-013`  
**목적**: `is_active = false`인 관리자가 권한을 잃는지 확인

**테스트 단계**:
1. Supabase에서 관리자 계정을 비활성화:
```sql
UPDATE public.admin_users 
SET is_active = false 
WHERE user_id = '<admin_user_id>';
```
2. 해당 계정으로 로그인
3. `/admin` 접속 시도

**기대 결과**:
- ✅ `isUserAdmin` 함수 `false` 반환
- ✅ 관리자 페이지 접근 차단
- ✅ 홈으로 리다이렉트

---

### 5.2 세션 만료 후 접근
**테스트 ID**: `ADMIN-014`  
**목적**: 세션이 만료된 후 관리자 페이지 접근 시 처리되는지 확인

**테스트 단계**:
1. 관리자로 로그인
2. 브라우저 개발자 도구 → Application → Cookies
3. Supabase 세션 쿠키 삭제 (`sb-<project>-auth-token`)
4. `/admin` 페이지 새로고침

**기대 결과**:
- ✅ "로그인이 필요합니다" 메시지
- ✅ `/login`으로 리다이렉트

---

### 5.3 동시 로그인 (다른 브라우저)
**테스트 ID**: `ADMIN-015`  
**목적**: 한 계정으로 여러 브라우저에서 동시 로그인 시 권한이 일관되게 동작하는지 확인

**테스트 단계**:
1. Chrome에서 관리자 계정 로그인
2. Firefox에서 동일 계정 로그인
3. 두 브라우저에서 각각 `/admin` 접속

**기대 결과**:
- ✅ 두 브라우저 모두 관리자 대시보드 접근 가능
- ✅ 통계 정보 일관되게 표시

---

## 6. React Query 상태 관리 테스트

### 6.1 권한 체크 캐싱
**테스트 ID**: `ADMIN-016`  
**목적**: React Query가 관리자 권한 체크 결과를 적절히 캐싱하는지 확인

**테스트 단계**:
1. 관리자 계정 로그인
2. 개발자 도구 Network 탭 열기
3. `/admin` 페이지 접속
4. 다른 관리자 페이지로 이동 (`/admin/users`)
5. Network 탭에서 `is_admin` RPC 호출 횟수 확인

**기대 결과**:
- ✅ 첫 접속 시 `is_admin` RPC 1회 호출
- ✅ 10분 이내 재접속 시 캐시된 데이터 사용 (추가 호출 **없음**)
- ✅ `staleTime: 1000 * 60 * 10` (10분) 설정 확인

---

### 6.2 권한 체크 에러 처리
**테스트 ID**: `ADMIN-017`  
**목적**: RPC 호출 실패 시 에러가 적절히 처리되는지 확인

**테스트 단계**:
1. Network 탭에서 `is_admin` RPC 요청 차단 (Throttling 또는 Offline 모드)
2. `/admin` 페이지 접속

**기대 결과**:
- ✅ "권한 확인 실패" Toast 메시지
- ✅ 로딩 상태 해제
- ✅ 관리자 페이지 **렌더링되지 않음**

---

## 7. 성능 테스트

### 7.1 관리자 페이지 초기 로딩 시간
**테스트 ID**: `ADMIN-018`  
**목적**: 관리자 페이지 로딩 성능 확인

**테스트 단계**:
1. Network 탭에서 속도 측정 (Performance Insights)
2. `/admin` 접속
3. First Contentful Paint (FCP), Largest Contentful Paint (LCP) 측정

**기대 결과**:
- ✅ FCP < 1.5초
- ✅ LCP < 2.5초
- ✅ 권한 체크 + 통계 조회 병렬 처리

---

## 8. 보안 테스트

### 8.1 JWT 토큰 조작 시도
**테스트 ID**: `ADMIN-019`  
**목적**: JWT 토큰을 조작하여 관리자 권한을 얻을 수 없는지 확인

**테스트 단계**:
1. 비관리자 계정 로그인
2. 개발자 도구 → Application → Cookies
3. `sb-<project>-auth-token` 값 확인
4. JWT 디코더로 payload 확인 및 조작 시도
5. 조작된 토큰으로 `/admin` 접속 시도

**기대 결과**:
- ✅ Supabase가 서명 검증 실패로 토큰 거부
- ✅ 401 Unauthorized 또는 403 Forbidden
- ✅ 관리자 페이지 접근 차단

---

### 8.2 SQL Injection 시도
**테스트 ID**: `ADMIN-020`  
**목적**: SQL Injection 공격이 차단되는지 확인

**테스트 단계**:
1. API 호출 시 악의적인 입력 전송:
```javascript
fetch('/api/admin/stats', {
  method: 'GET',
  headers: {
    'X-User-Id': "'; DROP TABLE users; --"
  }
}).then(r => r.json()).then(console.log)
```

**기대 결과**:
- ✅ Supabase Prepared Statements로 인해 SQL Injection 차단
- ✅ 정상적인 에러 응답 또는 무시
- ✅ 데이터베이스 무결성 유지

---

## 테스트 체크리스트

### 인증/권한
- [ ] ADMIN-001: 관리자 로그인
- [ ] ADMIN-002: 비관리자 로그인
- [ ] ADMIN-003: 관리자 대시보드 접근
- [ ] ADMIN-004: 비관리자 대시보드 접근 차단
- [ ] ADMIN-005: 미로그인 대시보드 접근 차단

### API 보호
- [ ] ADMIN-006: 관리자 API 호출 성공
- [ ] ADMIN-007: 비관리자 API 호출 차단
- [ ] ADMIN-008: 미인증 API 호출 차단

### RLS 정책
- [ ] ADMIN-009: 관리자 모든 사용자 조회
- [ ] ADMIN-010: 비관리자 타인 조회 차단
- [ ] ADMIN-011: 관리자 트랙 배정
- [ ] ADMIN-012: 비관리자 트랙 수정 차단

### 엣지 케이스
- [ ] ADMIN-013: 비활성 관리자 차단
- [ ] ADMIN-014: 세션 만료 처리
- [ ] ADMIN-015: 동시 로그인

### 상태 관리
- [ ] ADMIN-016: 권한 체크 캐싱
- [ ] ADMIN-017: 에러 처리

### 성능
- [ ] ADMIN-018: 페이지 로딩 시간

### 보안
- [ ] ADMIN-019: JWT 조작 차단
- [ ] ADMIN-020: SQL Injection 차단

---

## 테스트 실행 방법

### 1. 로컬 환경
```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3000 접속
# 위 테스트 시나리오 순차 실행
```

### 2. Supabase SQL Editor
```sql
-- Supabase 대시보드 → SQL Editor
-- 0010_enhance_admin_rls_policies.sql 실행 확인
-- RLS 정책 테스트 쿼리 실행
```

### 3. API 테스트 (cURL)
```bash
# 관리자 API 호출 (쿠키 필요)
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Cookie: sb-<project>-auth-token=<token>" \
  -H "Content-Type: application/json"
```

---

## 문제 발생 시 디버깅

### 관리자 권한이 인식되지 않을 때
```sql
-- 1. admin_users 테이블 확인
SELECT * FROM public.admin_users WHERE discord_id = '<discord_id>';

-- 2. is_admin 함수 테스트
SELECT public.is_admin('<user_id>');

-- 3. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'admin_users';
```

### API 호출이 403으로 차단될 때
1. 브라우저 개발자 도구 → Network 탭
2. 요청 헤더의 Cookie 확인
3. `sb-<project>-auth-token` 유효성 확인
4. 서버 콘솔 로그 확인

---

## 보고

테스트 완료 후 다음 정보를 포함하여 보고:

1. **테스트 환경**: 브라우저, OS, Node 버전
2. **성공한 테스트**: 체크리스트
3. **실패한 테스트**: 테스트 ID, 에러 메시지, 스크린샷
4. **성능 지표**: 페이지 로딩 시간, API 응답 시간
5. **보안 이슈**: 발견된 취약점 및 권장 사항

