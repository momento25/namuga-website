# namuga.app

`나무가 나뭇가지에게` 서비스의 공식 웹사이트 (홈 / 서비스 소개 / 블로그 / 지원 / 개인정보처리방침 / 이용약관).

순수 정적 HTML/CSS + 최소 JS + 간단한 Node 빌드 스크립트로 구성되어 있습니다. 프레임워크(React/Next 등)를 사용하지 않습니다.

## 구조

```
.
├── index.html               홈 (소스)
├── privacy/index.html       개인정보처리방침 (소스)
├── terms/index.html         이용약관 (소스)
├── support/index.html       지원 (소스)
├── style.css                디자인 시스템 + 컴포넌트 스타일
├── main.js                  모바일 메뉴 토글, 블로그 필터 (10-20줄)
├── _partials/               파셜 (빌드 시 include)
│   ├── head.html            <meta>, 폰트, style.css
│   ├── header.html          상단 네비 (sticky)
│   ├── footer.html          푸터
│   ├── download-buttons.html          App Store / Google Play pill 쌍 (light bg)
│   ├── download-buttons-on-dark.html  primary 배경용 쌍
│   └── cta-download.html    마지막 CTA 섹션 통째로
├── content/blog/*.md        블로그 원본 (마크다운 + frontmatter)
├── images/                  이미지 (없으면 placeholder)
├── site.config.js           SITE_EMAIL, APP_STORE_URL 등 상수
├── build.mjs                빌드 스크립트
└── dist/                    빌드 산출물 (gitignore)
```

## 상수 관리

`site.config.js`에서 관리합니다. 앱 스토어 URL 확정 시 아래 값 교체:

```js
export const site = {
  email: 'contact@namuga.app',      // 확정 시 교체
  appStoreUrl: '#',                 // 심사 완료 후 교체
  playStoreUrl: '#',                // 심사 완료 후 교체
  ...
};
```

HTML 소스에서는 `{{SITE_EMAIL}}`, `{{APP_STORE_URL}}`, `{{PLAY_STORE_URL}}` 형태로 참조합니다.

## 로컬 실행

```bash
npm install    # 최초 1회
npm run build  # dist/ 생성
npm run dev    # 빌드 + http://localhost:8000 서비스
```

또는 빌드 후 임의의 정적 서버로 dist/를 서빙해도 됩니다.

```bash
npm run build
python3 -m http.server 8000 -d dist
```

## 블로그 글 발행

1. `content/blog/{slug}.md` 파일을 생성합니다.
2. 상단에 frontmatter를 작성합니다:

   ```markdown
   ---
   title: 글 제목
   description: 목록/OG에 사용될 요약 (1~2문장)
   date: 2026-07-01
   category: guide      # guide | story | essay | wisdom
   slug: url-safe-slug  # (선택) 파일명과 다르게 하고 싶을 때
   keywords:
     - 키워드1
     - 키워드2
   thumbnail: filename.jpg   # (선택) images/ 안의 파일명
   ---

   본문은 마크다운으로 작성합니다.
   ```

3. `npm run build` 실행. `dist/blog/{slug}/index.html`이 생성되고 목록과 sitemap/rss에 자동 반영됩니다.
4. commit → push. Vercel이 자동 배포합니다.

## 배포 (Vercel)

Vercel Project Settings:

- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install` (기본)
- **Node.js Version**: 20.x (또는 22.x/24.x — LTS 최신)

로컬 CLI 배포: `vercel` (프리뷰) / `vercel --prod` (프로덕션).
GitHub 연동 시 push하면 자동 배포됩니다.

## 이미지 추가

`images/` 폴더에 파일을 넣으면 빌드 시 자동으로 사용됩니다. 파일이 없으면 placeholder가 렌더링됩니다. 규격은 `images/README.md` 참고.
