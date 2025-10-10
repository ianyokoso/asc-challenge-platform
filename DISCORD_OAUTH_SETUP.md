# Discord OAuth2 연동 설정 가이드

Discord OAuth2 인증이 구현되었습니다. 실제로 작동하려면 다음 설정이 필요합니다.

## 📋 1단계: Discord Developer Portal 설정

### 1.1 Discord Application 생성
1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. "New Application" 버튼 클릭
3. 애플리케이션 이름 입력 (예: "ASC 챌린지 플랫폼")
4. 생성 완료

### 1.2 OAuth2 설정
1. 왼쪽 메뉴에서 "OAuth2" 선택
2. "Redirects" 섹션에서 "Add Redirect" 클릭
3. 다음 URL 추가:
   ```
   http://localhost:3001/auth/callback
   ```
4. 프로덕션 환경용 URL도 추가 (예: `https://your-domain.com/auth/callback`)
5. "Save Changes" 클릭

### 1.3 Client ID & Client Secret 확인
1. "OAuth2" 페이지에서 "Client ID" 복사
2. "Client Secret"의 "Reset Secret" 클릭 (처음이라면) 또는 "Copy" 클릭
3. ⚠️ **중요**: Client Secret은 다시 볼 수 없으니 안전한 곳에 저장하세요!

## 📋 2단계: Supabase 설정

### 2.1 Supabase 프로젝트 생성
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호, 리전 선택
4. 프로젝트 생성 완료까지 대기 (약 2분)

### 2.2 Supabase Auth 설정
1. 프로젝트 대시보드에서 "Authentication" > "Providers" 선택
2. "Discord" 찾아서 활성화
3. Discord Developer Portal에서 복사한 정보 입력:
   - **Client ID**: Discord OAuth2의 Client ID
   - **Client Secret**: Discord OAuth2의 Client Secret
4. "Save" 클릭

### 2.3 Supabase API 키 확인
1. "Settings" > "API" 선택
2. 다음 정보 복사:
   - **Project URL**: `https://[your-project].supabase.co`
   - **anon public key**: `eyJ...` (길은 JWT 토큰)

## 📋 3단계: 환경 변수 설정

### 3.1 .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Discord OAuth2
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3001/auth/callback

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3.2 실제 값으로 교체
위의 placeholder 값을 실제 값으로 교체하세요:

- `https://your-project.supabase.co` → 2.3단계의 Project URL
- `your-anon-key-here` → 2.3단계의 anon public key
- `your_discord_client_id_here` → 1.3단계의 Client ID
- `your_discord_client_secret_here` → 1.3단계의 Client Secret

## 📋 4단계: 개발 서버 재시작

환경 변수를 변경했으므로 개발 서버를 재시작해야 합니다:

```bash
# 현재 실행 중인 서버 중지 (Ctrl + C)
# 그리고 다시 시작
npm run dev
```

## 🧪 5단계: 테스트

### 5.1 로그인 테스트
1. 브라우저에서 `http://localhost:3001/login` 접속
2. "Discord로 로그인" 버튼 클릭
3. Discord 로그인 페이지로 리다이렉트 확인
4. Discord 계정으로 로그인
5. 권한 승인 후 `/tracks` 페이지로 리다이렉트 확인

### 5.2 사용자 정보 확인
1. Navbar의 프로필 아이콘 확인
2. Discord 아바타와 이름이 표시되는지 확인
3. 드롭다운에서 사용자 정보 확인

### 5.3 로그아웃 테스트
1. Navbar 프로필 드롭다운 열기
2. "로그아웃" 클릭
3. 로그인 페이지로 리다이렉트 확인

## 🚨 문제 해결

### "Invalid OAuth2 Redirect URI" 오류
- Discord Developer Portal에서 Redirect URI가 정확히 설정되었는지 확인
- `http://localhost:3001/auth/callback` (끝에 슬래시 없음)

### "Invalid Client Credentials" 오류
- `.env.local`의 Client ID와 Client Secret 확인
- Supabase Discord Provider 설정 확인

### 사용자 정보가 표시되지 않음
- 브라우저 콘솔에서 오류 확인
- Supabase Dashboard > Authentication > Users에서 사용자 생성 확인

### 환경 변수가 적용되지 않음
- 개발 서버 재시작 (`Ctrl + C` 후 `npm run dev`)
- `.env.local` 파일이 프로젝트 루트에 있는지 확인

## 📝 추가 정보

### Supabase 데이터베이스 스키마
사용자 인증 정보는 Supabase의 `auth.users` 테이블에 자동으로 저장됩니다.

추가 사용자 프로필 정보를 저장하려면 `public.profiles` 테이블을 생성하세요:

```sql
-- profiles 테이블 생성
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  discord_id text,
  username text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.profiles enable row level security;

-- 정책 생성 (사용자는 자신의 프로필만 읽을 수 있음)
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);
```

### 프로덕션 배포 시
프로덕션 환경에서는:
1. Discord Developer Portal에 프로덕션 Redirect URI 추가
2. 환경 변수를 프로덕션 서버에 설정
3. `NEXT_PUBLIC_APP_URL`을 프로덕션 도메인으로 변경

## ✅ 완료!

모든 설정이 완료되면 사용자들이 Discord 계정으로 간편하게 로그인할 수 있습니다! 🎉

