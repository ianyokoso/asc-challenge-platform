# Supabase Migrations

이 디렉토리에는 ASC 챌린지 플랫폼의 데이터베이스 스키마 마이그레이션이 포함되어 있습니다.

## 📋 마이그레이션 목록

1. **0001_create_users_table.sql** - 사용자 프로필 테이블 (Discord 연동)
2. **0002_create_tracks_table.sql** - 트랙 정보 테이블 (Short-form, Long-form, Builder, Sales)
3. **0003_create_user_tracks_table.sql** - 사용자 트랙 등록 테이블
4. **0004_create_certifications_table.sql** - 인증 기록 테이블
5. **0005_create_titles_table.sql** - 칭호 시스템 테이블
6. **0006_create_user_titles_table.sql** - 사용자 획득 칭호 테이블
7. **0007_create_admin_users_table.sql** - 관리자 권한 테이블
8. **0008_create_mission_contents_table.sql** - 미션 컨텐츠 테이블
9. **0009_create_helper_functions.sql** - 헬퍼 함수들 (streak 계산, 리더보드 등)

## 🚀 마이그레이션 적용 방법

### 방법 1: Supabase Dashboard (권장)

1. **Supabase Dashboard** 접속: https://supabase.com/dashboard
2. 프로젝트 선택: `lowqnkwmsxtafyckkjbm`
3. 왼쪽 메뉴 **SQL Editor** 클릭
4. **New Query** 버튼 클릭
5. 마이그레이션 파일을 **순서대로** 복사해서 실행:
   - `0001_create_users_table.sql`
   - `0002_create_tracks_table.sql`
   - ... (순서대로)
6. 각 파일 실행 후 **Run** 버튼 클릭

### 방법 2: Supabase CLI (로컬 개발)

```bash
# Supabase CLI 설치 (한 번만)
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref lowqnkwmsxtafyckkjbm

# 마이그레이션 적용
supabase db push
```

## 📊 데이터베이스 스키마 개요

### Core Tables

- **users** - 사용자 프로필 (Discord OAuth2)
- **tracks** - 챌린지 트랙 (4가지 타입)
- **user_tracks** - 사용자가 등록한 트랙
- **certifications** - 인증 기록 (URL, 날짜, 상태)

### Achievement System

- **titles** - 칭호 정보 (일일/주간 달성 기준)
- **user_titles** - 사용자가 획득한 칭호

### Admin & Content

- **admin_users** - 관리자 권한
- **mission_contents** - 트랙별 미션 내용

## 🔐 Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있습니다:
- 사용자는 자신의 데이터만 읽기/쓰기 가능
- 리더보드/프로필 등 공개 데이터는 누구나 읽기 가능
- 관리자는 elevated permissions 보유

## 📈 Helper Functions

### `get_user_streak(user_id, track_id)`
사용자의 현재 연속 인증일 계산

### `get_user_total_certifications(user_id, track_id?)`
사용자의 총 인증 횟수 계산

### `get_leaderboard(track_id?, limit)`
리더보드 데이터 가져오기

### `is_admin(user_id)`
사용자가 관리자인지 확인

## 🎯 다음 단계

마이그레이션 적용 후:
1. TypeScript 타입 정의 생성
2. Supabase 클라이언트 API 함수 작성
3. React Query hooks 구현
4. 페이지 컴포넌트와 연동

