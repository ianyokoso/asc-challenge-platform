# 관리자 로그인 무한 로딩 해결 방법

## 문제 원인
관리자 계정의 브라우저에 캐시된 Supabase 세션이 기존 RLS 정책을 계속 참조하여 무한 루프 발생

## 해결 단계

### 1단계: 브라우저 세션 완전 초기화

#### 방법 A: 개발자 도구 사용 (추천)
1. 사이트 접속 (https://asc-challenge-platform.vercel.app)
2. **F12** 눌러서 개발자 도구 열기
3. **Application** 탭 클릭
4. 왼쪽 사이드바에서:
   - **Local Storage** 확장
   - **Session Storage** 확장
   - **Cookies** 확장
5. 각 항목에서 `asc-challenge-platform.vercel.app` 또는 `supabase` 관련 항목 **모두 삭제**
6. **Clear storage** 버튼 클릭 (모든 스토리지 삭제)

#### 방법 B: 시크릿 모드 (빠른 테스트)
1. **Ctrl + Shift + N** (Chrome) 또는 **Ctrl + Shift + P** (Firefox)
2. 시크릿 창에서 사이트 접속
3. 관리자 계정으로 다시 로그인 시도

#### 방법 C: 브라우저 캐시 완전 삭제
1. **Ctrl + Shift + Delete**
2. "쿠키 및 기타 사이트 데이터" 체크
3. "캐시된 이미지 및 파일" 체크
4. 기간: **전체 기간** 선택
5. **데이터 삭제** 클릭

### 2단계: 다시 로그인 시도
1. 완전히 로그아웃 상태에서 시작
2. Discord 로그인 진행
3. 관리자로 정상 로그인되는지 확인

### 3단계: 여전히 안 되면
Supabase Dashboard에서 확인:
1. https://app.supabase.com
2. 프로젝트 선택
3. **SQL Editor**에서 다음 쿼리 실행:

```sql
-- 관리자 등록 확인
SELECT * FROM public.admin_users WHERE is_active = true;

-- 관리자 함수 테스트 (자신의 user_id로 교체)
SELECT public.is_admin('YOUR_USER_ID_HERE');
```

### 4단계: 추가 디버깅
콘솔에서 다음 로그 확인:
- `🔍 [isUserAdmin] Checking admin status for user:`
- `✅ [isUserAdmin] Admin check result:`

만약 이 로그가 무한 반복되면 Supabase RLS 정책이 제대로 적용되지 않은 것입니다.

## 최종 확인 사항
- [ ] Supabase SQL 마이그레이션 실행 완료
- [ ] 브라우저 캐시/쿠키 완전 삭제
- [ ] 다른 멤버 로그인은 정상 작동
- [ ] 관리자 로그인 시도

## 여전히 문제가 있다면
`admin_users` 테이블에 관리자 계정이 제대로 등록되어 있는지 확인 필요.

