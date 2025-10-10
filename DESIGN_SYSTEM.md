# ASC Challenge Platform - Design System

## 개요

ASC 챌린지 인증 플랫폼을 위한 디자인 시스템 가이드입니다. 일관된 사용자 경험을 제공하기 위한 컬러 팔레트와 타이포그래피 가이드라인을 정의합니다.

---

## 🎨 컬러 팔레트

### Primary Colors (메인 액션 버튼)

주요 액션 버튼과 핵심 UI 요소에 사용됩니다.

| 상태 | HEX | HSL | Tailwind Class |
|------|-----|-----|----------------|
| Default | `#004E89` | `hsl(204, 100%, 27%)` | `bg-primary` |
| Hover | `#003A68` | `hsl(204, 100%, 22%)` | `bg-primary-hover` |
| Active | `#002747` | `hsl(204, 100%, 17%)` | `bg-primary-active` |
| Foreground | `#FFFFFF` | `hsl(0, 0%, 100%)` | `text-primary-foreground` |

### Secondary Colors (보조 액션 및 링크)

보조 버튼, 링크, 부가적인 UI 요소에 사용됩니다.

| 상태 | HEX | HSL | Tailwind Class |
|------|-----|-----|----------------|
| Default | `#1F77B4` | `hsl(204, 75%, 41%)` | `bg-secondary` |
| Hover | `#176399` | `hsl(204, 75%, 36%)` | `bg-secondary-hover` |
| Active | `#104F7E` | `hsl(204, 75%, 31%)` | `bg-secondary-active` |
| Foreground | `#FFFFFF` | `hsl(0, 0%, 100%)` | `text-secondary-foreground` |

### Accent Colors (강조, 알림, 배지)

하이라이트, 알림, 배지, 성취 등에 사용됩니다.

| 상태 | HEX | HSL | Tailwind Class |
|------|-----|-----|----------------|
| Default | `#FFB400` | `hsl(43, 100%, 50%)` | `bg-accent` |
| Hover | `#E6A200` | `hsl(43, 100%, 45%)` | `bg-accent-hover` |
| Active | `#CC9000` | `hsl(43, 100%, 40%)` | `bg-accent-active` |
| Foreground | `#000000` | `hsl(0, 0%, 0%)` | `text-accent-foreground` |

### Grayscale Palette (회색조)

텍스트, 배경, 경계선 등 중립적인 UI 요소에 사용됩니다.

| Shade | HEX | HSL | Tailwind Class | 용도 |
|-------|-----|-----|----------------|------|
| 50 | `#F5F7FA` | `hsl(214, 32%, 97%)` | `bg-gray-50` | 배경, 매우 밝은 영역 |
| 100 | `#E5E9EF` | `hsl(214, 20%, 92%)` | `bg-gray-100` | 연한 배경 |
| 200 | `#C9D1DB` | `hsl(214, 15%, 82%)` | `bg-gray-200` | 경계선, 구분선 |
| 300 | `#9AA5B6` | `hsl(214, 12%, 65%)` | `bg-gray-300` | 비활성 상태 |
| 400 | `#788593` | `hsl(214, 10%, 50%)` | `bg-gray-400` | 플레이스홀더 |
| 500 | `#4F5D6D` | `hsl(214, 12%, 35%)` | `bg-gray-500` | 보조 텍스트 |
| 600 | `#363F4D` | `hsl(214, 15%, 25%)` | `bg-gray-600` | 아이콘 |
| 700 | `#2E3A46` | `hsl(214, 18%, 18%)` | `bg-gray-700` | 본문 텍스트 |
| 800 | `#1E252E` | `hsl(214, 20%, 12%)` | `bg-gray-800` | 헤딩 텍스트 |
| 900 | `#131820` | `hsl(214, 24%, 8%)` | `bg-gray-900` | 다크 배경 |

---

## ✍️ 타이포그래피

### 폰트 패밀리

- **Headings (제목)**: Inter
- **Body (본문)**: Roboto

### 폰트 크기 및 스타일

#### Headings (제목)

| 레벨 | 크기 | Line Height | Letter Spacing | Font Weight | Tailwind Class |
|------|------|-------------|----------------|-------------|----------------|
| H1 | 3.5rem (56px) | 1.2 | -0.02em | 700 (Bold) | `text-h1 font-heading` |
| H2 | 3rem (48px) | 1.25 | -0.01em | 700 (Bold) | `text-h2 font-heading` |
| H3 | 2.5rem (40px) | 1.3 | -0.01em | 600 (Semibold) | `text-h3 font-heading` |
| H4 | 2rem (32px) | 1.35 | 0 | 600 (Semibold) | `text-h4 font-heading` |
| H5 | 1.5rem (24px) | 1.4 | 0 | 600 (Semibold) | `text-h5 font-heading` |
| H6 | 1.25rem (20px) | 1.45 | 0 | 600 (Semibold) | `text-h6 font-heading` |

#### Body Text (본문)

| 크기 | 크기 (px) | Line Height | Letter Spacing | Font Weight | Tailwind Class |
|------|-----------|-------------|----------------|-------------|----------------|
| Large | 1.125rem (18px) | 1.75 | 0 | 400 (Regular) | `text-body-lg` |
| Default | 1rem (16px) | 1.5 | 0 | 400 (Regular) | `text-body` |
| Small | 0.875rem (14px) | 1.5 | 0 | 400 (Regular) | `text-body-sm` |
| Extra Small | 0.75rem (12px) | 1.5 | 0 | 400 (Regular) | `text-body-xs` |

### 폰트 웨이트

| 이름 | Weight | 사용처 |
|------|--------|--------|
| Regular | 400 | 본문 텍스트 |
| Medium | 500 | 강조 텍스트 |
| Semibold | 600 | 소제목, 버튼 |
| Bold | 700 | 제목, 강한 강조 |

---

## 📚 사용 예시

### Tailwind CSS 사용 예시

#### 1. Primary 버튼

```tsx
<button className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground px-6 py-3 rounded-lg font-semibold transition-colors">
  인증하기
</button>
```

#### 2. Secondary 버튼

```tsx
<button className="bg-secondary hover:bg-secondary-hover active:bg-secondary-active text-secondary-foreground px-6 py-3 rounded-lg font-semibold transition-colors">
  상세보기
</button>
```

#### 3. Accent 배지

```tsx
<span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-body-sm font-medium">
  신규
</span>
```

#### 4. 타이포그래피

```tsx
{/* 페이지 제목 */}
<h1 className="text-h1 font-heading text-gray-900">
  ASC 챌린지 인증
</h1>

{/* 섹션 제목 */}
<h2 className="text-h2 font-heading text-gray-800">
  오늘의 미션
</h2>

{/* 본문 텍스트 */}
<p className="text-body text-gray-700">
  오늘도 열심히 챌린지를 수행해주셔서 감사합니다.
</p>

{/* 캡션 */}
<span className="text-body-sm text-gray-500">
  마감: 2025년 10월 10일 23:59
</span>
```

#### 5. 카드 컴포넌트

```tsx
<div className="bg-card border border-gray-200 rounded-lg p-6 shadow-sm">
  <h3 className="text-h5 font-heading text-gray-800 mb-2">
    Short-form 챌린지
  </h3>
  <p className="text-body text-gray-600 mb-4">
    매일 숏폼 콘텐츠를 제작하고 인증하세요.
  </p>
  <button className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-body-sm font-semibold transition-colors">
    시작하기
  </button>
</div>
```

### Plain CSS 사용 예시

#### CSS Custom Properties 접근

모든 색상과 타이포그래피는 CSS 변수로 정의되어 있습니다:

```css
.custom-button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-family: var(--font-roboto), Roboto, sans-serif;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.custom-button:hover {
  background-color: hsl(var(--primary-hover));
}

.custom-button:active {
  background-color: hsl(var(--primary-active));
}
```

### TypeScript 사용 예시

디자인 시스템 토큰을 TypeScript에서 사용:

```typescript
import { colorPalette, typography } from '@/constants/design-system';

// 색상 사용
const primaryColor = colorPalette.primary.DEFAULT; // '#004E89'
const accentColor = colorPalette.accent.DEFAULT;   // '#FFB400'

// 타이포그래피 사용
const h1Style = typography.fontSize.h1;
// { size: '3.5rem', lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }
```

---

## 🎯 디자인 원칙

1. **일관성**: 모든 UI 요소는 정의된 색상 팔레트와 타이포그래피를 따릅니다.
2. **접근성**: 충분한 색상 대비를 유지하여 가독성을 보장합니다.
3. **확장성**: 필요에 따라 추가 색상과 스타일을 쉽게 확장할 수 있습니다.
4. **반응성**: 모든 크기는 rem 단위를 사용하여 반응형 디자인을 지원합니다.

---

## 🔄 다크 모드

다크 모드는 자동으로 지원되며, `.dark` 클래스가 HTML 요소에 추가되면 활성화됩니다.

```tsx
{/* 다크 모드 토글 */}
<button onClick={() => document.documentElement.classList.toggle('dark')}>
  다크 모드 전환
</button>
```

다크 모드에서 색상 변수가 자동으로 조정되어 적절한 대비를 유지합니다.

---

## 📦 파일 위치

- **CSS 변수**: `src/app/globals.css`
- **Tailwind 설정**: `tailwind.config.ts`
- **TypeScript 상수**: `src/constants/design-system.ts`
- **레이아웃 (폰트 로드)**: `src/app/layout.tsx`

---

## ✅ 체크리스트

디자인 시스템을 적용할 때 다음을 확인하세요:

- [ ] 정의된 색상만 사용 (임의의 색상 값 사용 금지)
- [ ] 타이포그래피 스케일 준수
- [ ] 버튼과 링크에 hover/active 상태 적용
- [ ] 충분한 색상 대비 (WCAG AA 이상)
- [ ] rem 단위 사용 (px 대신)
- [ ] 폰트 패밀리 적절히 사용 (제목: Inter, 본문: Roboto)

---

**마지막 업데이트**: 2025-10-10

