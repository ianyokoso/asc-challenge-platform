# Vercel 배포 가이드

## 📋 배포 전 준비사항

### 1️⃣ GitHub에 푸시하기

```bash
# Git 상태 확인
git status

# 변경사항 추가
git add .

# 커밋
git commit -m "feat: 멀티 트랙 인증 시스템 구현"

# GitHub에 푸시
git push origin main
```

---

## 🚀 Vercel 배포 단계

### 1단계: Vercel 로그인

1. [Vercel](https://vercel.com) 접속
2. GitHub 계정으로 로그인
3. **"Add New..."** → **"Project"** 클릭

### 2단계: 프로젝트 Import

1. GitHub 저장소 목록에서 프로젝트 선택
2. **"Import"** 클릭

### 3단계: 프로젝트 설정

**Framework Preset**: Next.js (자동 감지됨)

**Root Directory**: `./` (기본값)

**Build Command**: `npm run build` (자동 설정됨)

**Output Directory**: `.next` (자동 설정됨)

### 4단계: 환경 변수 설정 ⚠️ **중요!**

**Environment Variables** 섹션에서 다음 환경 변수를 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lowqnkwmsxtafyckkjbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 환경 변수 입력 방법:

1. **Name**: 환경 변수 이름 (예: `NEXT_PUBLIC_SUPABASE_URL`)
2. **Value**: 환경 변수 값 (`.env.local` 파일에서 복사)
3. **Environment**: `Production`, `Preview`, `Development` 모두 선택
4. **"Add"** 클릭하여 추가
5. 모든 환경 변수에 대해 반복

> ⚠️ **주의**: `.env.local` 파일의 실제 값을 입력하세요!

### 5단계: 배포

1. **"Deploy"** 버튼 클릭
2. 배포 진행 상황 확인 (약 2-3분 소요)
3. 배포 완료 후 **"Visit"** 클릭하여 사이트 확인

---

## 🔧 배포 후 설정

### Discord OAuth Redirect URI 업데이트

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 애플리케이션 선택
3. **OAuth2** → **Redirects** 메뉴
4. 새로운 Redirect URI 추가:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. **"Save Changes"** 클릭

### Supabase Redirect URL 업데이트

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Authentication** → **URL Configuration**
4. **Site URL** 업데이트:
   ```
   https://your-app.vercel.app
   ```
5. **Redirect URLs**에 추가:
   ```
   https://your-app.vercel.app/auth/callback
   ```
6. **Save** 클릭

---

## 🔄 환경 변수 업데이트 (배포 후)

배포 후 `NEXT_PUBLIC_APP_URL`을 Vercel에서 제공한 실제 도메인으로 업데이트해야 합니다:

1. Vercel 프로젝트 대시보드
2. **Settings** → **Environment Variables**
3. `NEXT_PUBLIC_APP_URL` 찾기
4. 값을 실제 Vercel URL로 변경 (예: `https://your-app.vercel.app`)
5. **Save** 클릭
6. **Deployments** → 최근 배포 → **"Redeploy"** 클릭

---

## ✅ 배포 확인

배포가 완료되면 다음 페이지들이 정상 작동하는지 확인하세요:

- [ ] **홈 페이지** (`/`)
- [ ] **로그인** (`/login`)
- [ ] **Discord OAuth2** (로그인 테스트)
- [ ] **트랙 선택** (`/tracks`)
- [ ] **트랙별 인증 페이지** (`/certify/short-form`, `/certify/builder`, etc.)
- [ ] **캘린더** (`/calendar`)
- [ ] **프로필** (`/profile`)
- [ ] **관리자 대시보드** (`/admin`)

---

## 🐛 배포 문제 해결

### 환경 변수 오류

**증상**: "Supabase is not configured" 또는 OAuth 실패

**해결**:
1. Vercel 환경 변수가 올바르게 설정되었는지 확인
2. 변수 이름에 오타가 없는지 확인
3. 재배포: **Deployments** → **"Redeploy"**

### Discord OAuth 실패

**증상**: Discord 로그인 후 오류 발생

**해결**:
1. Discord Developer Portal의 Redirect URI 확인
2. Supabase의 Redirect URL 확인
3. `NEXT_PUBLIC_APP_URL`이 올바른지 확인

### 빌드 실패

**증상**: Vercel 배포 중 빌드 에러

**해결**:
1. 로컬에서 `npm run build` 실행하여 에러 확인
2. 에러 수정 후 다시 푸시
3. Vercel이 자동으로 재배포

---

## 🎯 커스텀 도메인 설정 (선택사항)

1. Vercel 프로젝트 대시보드
2. **Settings** → **Domains**
3. **"Add"** 클릭
4. 도메인 입력 (예: `asc-challenge.com`)
5. DNS 설정 안내에 따라 도메인 연결

---

## 📊 배포 모니터링

### Vercel Analytics (무료)

1. Vercel 프로젝트 대시보드
2. **Analytics** 탭
3. 방문자 수, 페이지 뷰 등 확인

### Supabase 모니터링

1. Supabase Dashboard
2. **Reports** 섹션
3. API 사용량, 데이터베이스 성능 확인

---

## 🔐 보안 체크리스트

- [ ] 환경 변수에 비밀 키가 노출되지 않았는지 확인
- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Supabase RLS 정책이 활성화되어 있는지 확인
- [ ] Discord OAuth2 Redirect URI가 정확한지 확인

---

## 🎉 배포 완료!

배포가 완료되면 Vercel에서 제공하는 URL로 접속하여 서비스를 이용할 수 있습니다!

```
https://your-app.vercel.app
```

---

## 💡 유용한 팁

### 1. 자동 배포 설정
- GitHub의 `main` 브랜치에 푸시하면 자동으로 배포됩니다
- Pull Request를 생성하면 Preview 환경이 자동 생성됩니다

### 2. 배포 로그 확인
- Vercel Dashboard → **Deployments** → 특정 배포 클릭
- 빌드 로그, 함수 로그 확인 가능

### 3. 환경별 환경 변수
- **Production**: 실제 서비스 환경
- **Preview**: PR/브랜치별 미리보기 환경
- **Development**: 로컬 개발 환경

---

## 📞 문제 발생 시

1. [Vercel 공식 문서](https://vercel.com/docs)
2. [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
3. [Supabase 문서](https://supabase.com/docs)
4. GitHub Issues에 문의

