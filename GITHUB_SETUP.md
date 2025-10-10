# GitHub 저장소 설정 가이드

## 🚀 GitHub 저장소 생성 및 연결

### 1단계: GitHub 저장소 생성

1. [GitHub](https://github.com) 접속 및 로그인
2. 우측 상단 **"+"** → **"New repository"** 클릭
3. 저장소 정보 입력:
   - **Repository name**: `asc-challenge-platform` (원하는 이름으로 변경 가능)
   - **Description**: ASC Challenge Platform - 멀티 트랙 인증 시스템
   - **Visibility**: **Public** 또는 **Private** 선택
   - ⚠️ **"Initialize this repository with:"** 체크박스 모두 **비활성화** (README, .gitignore, license 추가 안 함)
4. **"Create repository"** 클릭

### 2단계: GitHub 저장소 URL 복사

저장소 생성 후 나타나는 페이지에서:

```
https://github.com/your-username/your-repo-name.git
```

형식의 URL을 복사하세요.

### 3단계: 로컬 Git에 연결

터미널에서 다음 명령어를 실행하세요:

```bash
# 프로젝트 디렉토리로 이동
cd "/Users/tuemarz/Downloads/Assignment Certification"

# GitHub 저장소를 remote로 추가
git remote add origin https://github.com/your-username/your-repo-name.git

# main 브랜치로 푸시
git push -u origin main
```

> 💡 **your-username**과 **your-repo-name**을 실제 값으로 변경하세요!

### 4단계: 푸시 확인

GitHub 저장소 페이지를 새로고침하여 코드가 업로드되었는지 확인하세요.

---

## ✅ 완료 후

GitHub에 푸시가 완료되면 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) 파일을 참고하여 Vercel 배포를 진행하세요!

---

## 🔐 GitHub 인증 문제 해결

### Personal Access Token (권장)

GitHub에서 비밀번호 대신 Personal Access Token을 사용해야 합니다:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **"Generate new token"** → **"Generate new token (classic)"**
3. **Note**: "ASC Challenge Platform"
4. **Expiration**: 90 days (또는 원하는 기간)
5. **Scopes**: `repo` 체크
6. **"Generate token"** 클릭
7. 생성된 토큰 복사 (다시 볼 수 없으니 안전한 곳에 보관!)

### Push 시 인증

```bash
git push -u origin main
```

실행 시:
- **Username**: GitHub 사용자명
- **Password**: 생성한 Personal Access Token 붙여넣기

---

## 📝 요약

```bash
# 1. GitHub에서 새 저장소 생성
# 2. 터미널에서 실행:

git remote add origin https://github.com/your-username/your-repo-name.git
git push -u origin main

# 3. GitHub 저장소에서 코드 확인
# 4. Vercel 배포 진행!
```

---

## 🎯 다음 단계

✅ GitHub 푸시 완료
⬜ Vercel 배포 ([VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) 참고)

