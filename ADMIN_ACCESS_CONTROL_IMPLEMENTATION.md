# 관리자 접근 제어 구현 문서 (T-004)

## 📋 개요

ASC 챌린지 플랫폼의 관리자 전용 기능에 대한 **다층 보안 접근 제어**를 구현했습니다.

- ✅ **클라이언트 사이드**: React Query + Custom Hooks
- ✅ **서버 사이드**: Next.js Middleware + API Guards
- ✅ **데이터베이스**: Supabase Row Level Security (RLS)
- ✅ **인증**: Discord OAuth2 + Supabase Auth

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   클라이언트 사이드                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌────────────────────────┐     │
│  │ AdminPageGuard  │───▶│ useIsAdmin Hook        │     │
│  │ (HOC)           │    │ (React Query)          │     │
│  └─────────────────┘    └────────────────────────┘     │
│           │                      │                       │
│           ▼                      ▼                       │
│  ┌─────────────────────────────────────────────┐       │
│  │  getUser() → isUserAdmin()                  │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    서버 사이드                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌────────────────────────┐     │
│  │ withAdminAuth   │───▶│ checkAdminPermission() │     │
│  │ (API Middleware)│    │ (Server Utils)         │     │
│  └─────────────────┘    └────────────────────────┘     │
│           │                      │                       │
│           ▼                      ▼                       │
│  ┌─────────────────────────────────────────────┐       │
│  │  getServerUser() → Supabase RPC              │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase (Database)                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌────────────────────────┐     │
│  │ RLS Policies    │───▶│ is_admin() RPC         │     │
│  │                 │    │ has_permission() RPC   │     │
│  └─────────────────┘    └────────────────────────┘     │
│           │                      │                       │
│           ▼                      ▼                       │
│  ┌─────────────────────────────────────────────┐       │
│  │  admin_users 테이블 (is_active, role)       │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 생성된 파일

### 서버 사이드 보안

#### 1. `src/lib/supabase/auth-server.ts`
서버 컴포넌트/API 라우트용 인증 유틸리티

**주요 함수**:
- `createServerSupabaseClient()`: 서버용 Supabase 클라이언트 생성
- `getServerUser()`: 서버 사이드에서 현재 사용자 가져오기
- `checkAdminPermission()`: 관리자 권한 확인
- `requireAdmin()`: 관리자 권한 강제 (throw error if not admin)

**사용 예시**:
```typescript
// API Route
import { requireAdmin } from '@/lib/supabase/auth-server';

export async function POST(request: NextRequest) {
  await requireAdmin(); // 관리자가 아니면 에러 throw
  // 관리자 전용 로직...
}
```

---

#### 2. `src/lib/api/admin-guard.ts`
API 라우트 보호 미들웨어

**주요 함수**:
- `withAdminAuth()`: API 라우트 권한 체크 미들웨어
- `requireAdminForAction()`: 서버 액션 권한 체크

**사용 예시**:
```typescript
// API Route
import { withAdminAuth } from '@/lib/api/admin-guard';

export async function GET(request: NextRequest) {
  const adminCheck = await withAdminAuth(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck; // 권한 없음 - 에러 응답
  }
  
  const { user } = adminCheck;
  // 관리자 전용 로직...
  return NextResponse.json({ data: '...' });
}
```

---

#### 3. `src/app/api/admin/stats/route.ts`
관리자 통계 API (보호된 엔드포인트 예시)

**엔드포인트**: `GET /api/admin/stats`  
**권한**: Admin only  
**응답**:
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

---

### 클라이언트 사이드 보호

#### 4. `src/components/admin/AdminPageGuard.tsx`
관리자 페이지 보호 HOC 컴포넌트

**기능**:
- ✅ 로그인 상태 확인
- ✅ 관리자 권한 확인 (React Query 사용)
- ✅ 권한 없음 시 자동 리다이렉트
- ✅ 로딩/에러 UI 제공
- ✅ Toast 알림

**사용 예시**:
```tsx
import { AdminPageGuard } from '@/components/admin/AdminPageGuard';

export default function AdminUsersPage() {
  return (
    <AdminPageGuard>
      <div>
        {/* 관리자 전용 컨텐츠 */}
        <h1>사용자 관리</h1>
      </div>
    </AdminPageGuard>
  );
}
```

---

### 데이터베이스 보안

#### 5. `supabase/migrations/0010_enhance_admin_rls_policies.sql`
Supabase RLS 정책 강화 마이그레이션

**포함 내용**:

1. **admin_users 테이블 RLS 정책**
   - SELECT: 관리자만 관리자 목록 조회 가능
   - INSERT: Super Admin만 새로운 관리자 추가 가능
   - UPDATE: Super Admin만 관리자 정보 수정 가능
   - DELETE: Super Admin만 관리자 삭제 가능

2. **user_tracks 테이블 관리자 정책**
   - 관리자는 모든 user_tracks 조회 가능
   - 관리자는 트랙 배정/제거 가능

3. **certifications 테이블 관리자 정책**
   - 관리자는 모든 인증 조회 가능
   - 관리자는 인증 상태 변경 가능 (승인/거부)

4. **users 테이블 관리자 정책**
   - 관리자는 모든 사용자 조회 가능
   - 관리자는 사용자 정보 수정 가능

5. **보안 강화 함수**
   - `is_super_admin(UUID)`: Super Admin 확인
   - `has_admin_permission(UUID, TEXT)`: 특정 권한 확인
   - `log_admin_action()`: 관리자 작업 로그 기록

6. **감사 로그 테이블** (`admin_audit_logs`)
   - 모든 관리자 작업 추적
   - IP 주소, User Agent 기록
   - 변경 내역 JSONB로 저장

**실행 방법**:
```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase Dashboard → SQL Editor
# 0010_enhance_admin_rls_policies.sql 내용 복사하여 실행
```

---

### 테스트 문서

#### 6. `ADMIN_ACCESS_CONTROL_TESTS.md`
포괄적인 테스트 시나리오 문서

**테스트 범위**:
- ✅ 관리자/비관리자 권한 확인 (5개 시나리오)
- ✅ API 라우트 보호 (3개 시나리오)
- ✅ Supabase RLS 정책 (4개 시나리오)
- ✅ 엣지 케이스 (세션 만료, 비활성화 등)
- ✅ React Query 상태 관리
- ✅ 성능 테스트
- ✅ 보안 테스트 (JWT 조작, SQL Injection)

**총 20개의 테스트 케이스** 포함

---

## 🔐 보안 계층

### 1. 클라이언트 사이드 (첫 번째 방어선)
- **목적**: UX 개선, 불필요한 API 호출 방지
- **도구**: React Query, Custom Hooks
- **위치**: `AdminPageGuard`, `useIsAdmin`
- **제한사항**: 우회 가능 (개발자 도구)

### 2. 서버 사이드 (두 번째 방어선)
- **목적**: 비즈니스 로직 보호
- **도구**: Next.js API Routes, Middleware
- **위치**: `withAdminAuth`, `checkAdminPermission`
- **보장**: HTTP 401/403 응답으로 접근 차단

### 3. 데이터베이스 (최종 방어선)
- **목적**: 데이터 무결성 보장
- **도구**: Supabase RLS
- **위치**: PostgreSQL Row Level Security Policies
- **보장**: SQL 레벨에서 완전 차단

---

## 🚀 사용 방법

### 관리자 페이지 보호

#### 방법 1: AdminPageGuard 사용 (권장)
```tsx
import { AdminPageGuard } from '@/components/admin/AdminPageGuard';

export default function AdminSettingsPage() {
  return (
    <AdminPageGuard>
      <div>관리자 설정 페이지</div>
    </AdminPageGuard>
  );
}
```

#### 방법 2: 수동 권한 체크
```tsx
'use client';

import { useIsAdmin } from '@/hooks/useAdmin';
import { getUser } from '@/lib/supabase/client';

export default function CustomAdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getUser().then(user => setUserId(user?.id || null));
  }, []);
  
  const { data: isAdmin, isLoading } = useIsAdmin(userId);
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access Denied</div>;
  
  return <div>관리자 전용 컨텐츠</div>;
}
```

---

### API 라우트 보호

```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api/admin-guard';

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const adminCheck = await withAdminAuth(request);
  if (adminCheck instanceof NextResponse) {
    return adminCheck; // 권한 없음 - 에러 응답
  }
  
  const { user } = adminCheck;
  
  // 관리자 전용 로직
  const users = await getAllUsers();
  
  return NextResponse.json({
    success: true,
    data: users,
  });
}
```

---

### 서버 액션 보호

```typescript
// app/actions/admin-actions.ts
'use server';

import { requireAdminForAction } from '@/lib/api/admin-guard';

export async function deleteUser(userId: string) {
  // 관리자 권한 확인 (throw error if not admin)
  await requireAdminForAction();
  
  // 관리자 전용 로직
  await db.users.delete({ where: { id: userId } });
  
  return { success: true };
}
```

---

## 🔧 설정

### 환경 변수

`.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Supabase 마이그레이션 실행

```bash
# 로컬 Supabase 사용 시
supabase db push

# 프로덕션 Supabase
# 1. Supabase Dashboard → SQL Editor
# 2. 0010_enhance_admin_rls_policies.sql 내용 복사
# 3. RUN 클릭
```

---

### 관리자 계정 추가

```sql
-- Discord로 로그인한 사용자를 관리자로 등록
INSERT INTO public.admin_users (user_id, discord_id, role, permissions)
VALUES (
  '<user_id>',
  '<discord_id>',
  'admin', -- 또는 'super_admin'
  ARRAY['read', 'write']
);
```

**관리자 확인**:
```sql
SELECT * FROM public.admin_users WHERE is_active = true;
```

---

## 📊 권한 레벨

### 1. 일반 사용자 (Non-Admin)
- ✅ 자신의 프로필 조회
- ✅ 자신의 인증 제출
- ✅ 리더보드 조회
- ❌ 관리자 페이지 접근 불가
- ❌ 타인의 데이터 조회/수정 불가

### 2. 관리자 (Admin)
- ✅ 모든 사용자 데이터 조회
- ✅ 트랙 배정/제거
- ✅ 인증 승인/거부
- ✅ 통계 조회
- ❌ 관리자 추가/삭제 불가

### 3. 슈퍼 관리자 (Super Admin)
- ✅ Admin의 모든 권한
- ✅ 새로운 관리자 추가
- ✅ 관리자 정보 수정/삭제
- ✅ 감사 로그 조회/삭제
- ✅ 시스템 설정 변경

---

## 🐛 트러블슈팅

### 문제: 관리자인데 "접근 권한 없음" 표시

**원인**: `admin_users` 테이블에 등록되지 않았거나 `is_active = false`

**해결**:
```sql
-- 1. 관리자 목록 확인
SELECT * FROM public.admin_users WHERE user_id = '<user_id>';

-- 2. 등록되지 않았으면 추가
INSERT INTO public.admin_users (user_id, discord_id, role)
VALUES ('<user_id>', '<discord_id>', 'admin');

-- 3. 비활성화되었으면 활성화
UPDATE public.admin_users 
SET is_active = true 
WHERE user_id = '<user_id>';
```

---

### 문제: API 호출 시 403 Forbidden

**원인**: 세션 쿠키가 전달되지 않음

**해결**:
```typescript
// Fetch API 사용 시 credentials 옵션 추가
fetch('/api/admin/stats', {
  method: 'GET',
  credentials: 'include', // ✅ 중요: 쿠키 포함
})
```

---

### 문제: RLS 정책 동작하지 않음

**원인**: RLS가 활성화되지 않았거나 정책 오류

**확인**:
```sql
-- 1. RLS 활성화 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 2. 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'admin_users';

-- 3. RLS 활성화 (필요 시)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
```

---

## 📈 성능 최적화

### React Query 캐싱 전략

```typescript
// src/hooks/useAdmin.ts
export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ['is-admin', userId],
    queryFn: () => (userId ? isUserAdmin(userId) : Promise.resolve(false)),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // ✅ 10분 캐싱
  });
}
```

**효과**:
- 10분 동안 중복 API 호출 방지
- 관리자 페이지 간 이동 시 즉시 렌더링

---

### 병렬 데이터 로딩

```typescript
// 관리자 대시보드
const { data: isAdmin } = useIsAdmin(userId);
const { data: stats } = useAdminStats();
const { data: candidates } = useDropoutCandidates();

// ✅ 3개의 쿼리가 병렬로 실행
// 전체 로딩 시간 = max(쿼리1, 쿼리2, 쿼리3)
```

---

## 🔄 업데이트 이력

### v1.0.0 (2025-01-10)
- ✅ 초기 관리자 접근 제어 구현
- ✅ 클라이언트/서버/DB 3단계 보안
- ✅ AdminPageGuard HOC 컴포넌트
- ✅ withAdminAuth API 미들웨어
- ✅ RLS 정책 강화
- ✅ 감사 로그 시스템
- ✅ 포괄적인 테스트 문서

---

## 📚 참고 자료

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)

---

## ✅ 완료 체크리스트

- [x] 서버 사이드 인증 유틸리티 (`auth-server.ts`)
- [x] API 라우트 보호 미들웨어 (`admin-guard.ts`)
- [x] 보호된 API 엔드포인트 예시 (`/api/admin/stats`)
- [x] 클라이언트 페이지 가드 컴포넌트 (`AdminPageGuard.tsx`)
- [x] 관리자 대시보드 개선 (에러 처리, Toast 알림)
- [x] Supabase RLS 정책 강화 마이그레이션
- [x] 감사 로그 시스템
- [x] 포괄적인 테스트 문서 (20개 시나리오)
- [x] 구현 문서 작성

---

## 🎯 다음 단계 (선택사항)

1. **E2E 테스트 자동화**: Playwright 또는 Cypress
2. **관리자 대시보드 확장**: 실시간 알림, 차트
3. **감사 로그 UI**: 관리자 작업 이력 페이지
4. **역할 기반 권한**: 세분화된 권한 관리 (RBAC)
5. **2단계 인증**: OTP 또는 SMS 인증 추가

---

**구현 완료일**: 2025-01-10  
**담당자**: ASC 챌린지 플랫폼 개발팀  
**테스트 상태**: ⏳ 테스트 대기 중

