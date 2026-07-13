# 출시 알림 이메일 CTA — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 다운로드 dead-link 상태의 CTA를 이메일 기반 "출시 알림 신청"으로 교체하고, 관련 버튼 라벨을 정리한다.

**Architecture:** 정적 HTML 사이트에 커스텀 폼을 추가하고, Vercel Serverless Function(`api/subscribe.js`)이 Stibee API를 호출해 이메일을 구독자로 등록한다. API 키는 서버 사이드 env로 보호.

**Tech Stack:** 순수 HTML/CSS/JS, Node.js 빌드 스크립트(`build.mjs`), Vercel Functions(Node.js), Stibee API.

## Global Constraints

- 프로젝트에 테스트 프레임워크 없음. "검증"은 `npm run build` 성공 + `dist/` 결과물 검사 + Vercel Preview 배포에서 수동 확인.
- 파일 include 문법: `<!-- @include:파일명 -->` (build.mjs가 처리). `_partials/파일명.html`을 찾아 치환.
- 이메일 CTA 문구는 스펙 확정본을 그대로 사용. 임의 변경 금지:
  - 제목: `앱 출시를 가장 먼저 알려드릴게요`
  - 서브: `준비되는 대로 소식을 이메일로 전해드릴게요.`
  - 버튼: `알림 신청`
  - 동의: `출시 알림 이메일 수신에 동의합니다.`
  - 히어로 CTA 버튼: `🔔 출시 알림 받기`
  - 헤더 버튼: `출시 알림 받기`
  - 성공 메시지: `🌸 감사합니다 — 서비스가 준비되면 가장 먼저 알려드릴게요.`
- 서버 함수는 이메일 원문을 로그로 남기지 않는다.
- 스티비 API 정확한 엔드포인트/헤더/페이로드 스키마는 구현 시점의 공식 문서로 확인 후 반영.
- 커밋 메시지 언어: 한국어 (기존 컨벤션).
- 이모지: `🔔`, `🌸`만 사용자 카피에 허용. 코드 내부 문자열엔 이모지 금지.

---

### Task 1: 폼 CSS 스타일 추가

**Files:**
- Modify: `style.css` (파일 하단 새 섹션 추가)

**Interfaces:**
- Produces: 클래스 `.notify-form`, `.notify-input-row`, `.notify-input`, `.notify-submit`, `.notify-consent`, `.notify-status`, `.notify-status.is-error`, `.notify-success`.
- Consumes: 기존 디자인 토큰 (`--color-surface`, `--color-primary-fg`, `--radius-pill`, `--color-border` 등).

- [ ] **Step 1: 새 스타일 블록 추가**

`style.css` 하단에 다음 블록을 붙인다:

```css
/* =========================================================
   Notify form (launch signup CTA)
   ========================================================= */

.notify-form {
  max-width: 520px;
  margin: 0 auto;
  text-align: left;
}

.notify-input-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
@media (min-width: 560px) {
  .notify-input-row { flex-direction: row; }
}

.notify-input {
  flex: 1;
  min-width: 0;
  padding: 14px 20px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 15px;
  line-height: 1.4;
}
.notify-input::placeholder { color: var(--color-text-muted); }
.notify-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.notify-submit {
  padding: 14px 28px;
  border-radius: var(--radius-pill);
  background: var(--color-text);
  color: var(--color-primary-fg);
  border: none;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.notify-submit:hover:not(:disabled) { opacity: 0.9; }
.notify-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.notify-consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 16px;
  font-size: 13.5px;
  line-height: 1.6;
  color: color-mix(in srgb, var(--color-primary-fg) 88%, transparent);
  text-align: left;
}
.notify-consent input[type="checkbox"] {
  flex-shrink: 0;
  margin-top: 3px;
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-fg);
}
.notify-consent a {
  color: var(--color-primary-fg);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.notify-status {
  min-height: 1.2em;
  margin-top: 12px;
  font-size: 13.5px;
  color: color-mix(in srgb, var(--color-primary-fg) 85%, transparent);
  text-align: left;
}
.notify-status.is-error {
  color: #FFD9C4;
}

.notify-success {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.6;
  color: var(--color-primary-fg);
}
.notify-success p { font-size: 15px; font-weight: 400; opacity: 0.9; margin-top: 8px; }
```

- [ ] **Step 2: 빌드해서 CSS가 dist에 반영됐는지 확인**

Run: `npm run build && grep -c "notify-form" dist/style.css`
Expected: 출력이 `1` 이상.

- [ ] **Step 3: 커밋**

```bash
git add style.css
git commit -m "style: 출시 알림 폼용 스타일 추가"
```

---

### Task 2: `cta-notify.html` 파셜 생성

**Files:**
- Create: `_partials/cta-notify.html`

**Interfaces:**
- Produces: `<!-- @include:cta-notify -->` include 지점.
- 폼은 `data-notify-form` 어트리뷰트로 마킹 (main.js가 이 셀렉터로 훅).

- [ ] **Step 1: 파셜 파일 생성**

`_partials/cta-notify.html`을 다음 내용으로 만든다:

```html
<section class="section" id="download">
  <div class="container">
    <div class="cta-block">
      <h2>앱 출시를 가장 먼저 알려드릴게요</h2>
      <p>준비되는 대로 소식을 이메일로 전해드릴게요.</p>
      <form class="notify-form" data-notify-form novalidate>
        <div class="notify-input-row">
          <label class="sr-only" for="notify-email">이메일</label>
          <input class="notify-input" id="notify-email" type="email" name="email"
                 autocomplete="email" placeholder="your@email.com" required>
          <button class="notify-submit" type="submit" data-notify-submit>알림 신청</button>
        </div>
        <label class="notify-consent">
          <input type="checkbox" name="consent" required>
          <span>출시 알림 이메일 수신에 동의합니다.
            <a href="{{ROOT}}privacy/">개인정보처리방침 보기</a></span>
        </label>
        <p class="notify-status" data-notify-status role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
</section>
```

- [ ] **Step 2: 커밋**

```bash
git add _partials/cta-notify.html
git commit -m "feat: 출시 알림 이메일 CTA 파셜 추가"
```

---

### Task 3: 홈페이지와 블로그 아티클을 새 CTA로 전환하고 옛 파일 삭제

**Files:**
- Modify: `index.html`
- Modify: `build.mjs`
- Delete: `_partials/cta-download.html`
- Delete: `_partials/download-buttons-on-dark.html`

**Interfaces:**
- Consumes: Task 2에서 만든 `cta-notify` 파셜.

- [ ] **Step 1: 홈페이지 include 교체**

`index.html`에서 `<!-- @include:cta-download -->`를 `<!-- @include:cta-notify -->`로 변경.

수정 대상 라인 (index.html:157):
```html
  <!-- @include:cta-download -->
```
→
```html
  <!-- @include:cta-notify -->
```

- [ ] **Step 2: 블로그 아티클 템플릿 교체**

`build.mjs` 안의 `buildBlogPost` 함수(340~346라인 부근)에서 하드코딩된 CTA 블록을 파셜 include로 축약.

Before:
```js
      <div class="article-cta">
        <div class="cta-block">
          <h2>부모님의 이야기, 오늘 시작해보세요</h2>
          <p>완벽한 순간을 기다릴 필요는 없습니다. 오늘의 질문 하나가 언젠가 가장 소중한 기록이 됩니다.</p>
          <!-- @include:download-buttons-on-dark -->
        </div>
      </div>
```

After:
```js
      <div class="article-cta">
        <!-- @include:cta-notify -->
      </div>
```

- [ ] **Step 3: 옛 파셜 두 개 삭제**

```bash
rm _partials/cta-download.html _partials/download-buttons-on-dark.html
```

- [ ] **Step 4: 사용처 잔존 여부 검사**

Run:
```bash
grep -rn "cta-download\|download-buttons-on-dark" _partials index.html build.mjs
```
Expected: 결과 없음 (exit 1). 남아 있으면 그 위치도 함께 수정.

- [ ] **Step 5: 빌드 & 결과물 확인**

Run:
```bash
npm run build
grep -c "앱 출시를 가장 먼저 알려드릴게요" dist/index.html
```
Expected: 출력이 `1` (홈에 새 CTA 존재).

블로그 글이 있다면:
```bash
find dist/blog -name index.html -not -path 'dist/blog/index.html' | head -1 | xargs grep -c "앱 출시를 가장 먼저 알려드릴게요"
```
Expected: `1`.

- [ ] **Step 6: 커밋**

```bash
git add index.html build.mjs _partials/cta-download.html _partials/download-buttons-on-dark.html
git commit -m "feat: 홈·블로그 하단 CTA를 출시 알림으로 통일, 옛 파셜 삭제"
```

---

### Task 4: 헤더·히어로 버튼 라벨 정리

**Files:**
- Modify: `_partials/header.html`
- Modify: `_partials/download-buttons.html`
- Modify: `index.html` (히어로 note 문구 한 줄)

**Interfaces:**
- 없음 (순수 마크업 변경).

- [ ] **Step 1: 헤더 버튼 라벨 변경**

`_partials/header.html`에서 `앱 다운로드` 문자열을 `출시 알림 받기`로 변경 (데스크탑·모바일 두 곳).

Before(11라인):
```html
      <a class="btn btn-primary btn-sm" href="{{ROOT}}#download">앱 다운로드</a>
```
After:
```html
      <a class="btn btn-primary btn-sm" href="{{ROOT}}#download">출시 알림 받기</a>
```

Before(26라인):
```html
    <a class="btn btn-primary" href="{{ROOT}}#download">앱 다운로드</a>
```
After:
```html
    <a class="btn btn-primary" href="{{ROOT}}#download">출시 알림 받기</a>
```

- [ ] **Step 2: 히어로 다운로드 버튼 → 단일 알림 버튼**

`_partials/download-buttons.html` 전체 내용을 다음으로 교체:

```html
<div class="hero-cta">
  <a class="btn btn-primary btn-lg" href="{{ROOT}}#download" data-ph-capture-attribute-cta="hero_notify">
    <span aria-hidden="true">🔔</span>
    <span>출시 알림 받기</span>
  </a>
</div>
```

- [ ] **Step 3: `.btn-lg` 스타일 존재 여부 확인 후 필요 시 추가**

Run: `grep -n "btn-lg" style.css`
- 결과 있음 → 그대로 사용.
- 결과 없음 → `style.css`의 Buttons 섹션(`/* Download button pair */` 블록 바로 위)에 아래 규칙을 추가:

```css
.btn-lg { padding: 16px 32px; font-size: 16px; }
```

- [ ] **Step 4: 히어로 note 문구 변경**

`index.html`(28라인):

Before:
```html
          <p class="hero-note">iOS · Android 무료 · 첫 질문은 오늘 바로</p>
```
After:
```html
          <p class="hero-note">iOS · Android · 곧 만나요</p>
```

- [ ] **Step 5: 빌드 검증**

Run:
```bash
npm run build
grep -c "출시 알림 받기" dist/index.html
```
Expected: 최소 `3` (헤더 데스크탑 + 헤더 모바일 + 히어로).

- [ ] **Step 6: 커밋**

```bash
git add _partials/header.html _partials/download-buttons.html index.html style.css
git commit -m "feat: 헤더·히어로 CTA 라벨을 출시 알림으로 통일"
```

---

### Task 5: 폼 제출 클라이언트 로직

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: DOM 셀렉터 `[data-notify-form]`, `[data-notify-status]`, `[data-notify-submit]` (Task 2에서 정의).
- Produces: `POST /api/subscribe` 호출(다음 태스크가 구현). 요청 바디: `{ email: string, consent: true }`. 성공은 HTTP 200 응답으로 판정.

- [ ] **Step 1: 이메일 유효성 검사 함수와 폼 핸들러 추가**

`main.js` 파일 맨 끝에 붙인다:

```js
// Launch notify form
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setStatus(el, message, isError) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', Boolean(isError));
}

function showSuccess(form) {
  const container = form.parentElement;
  if (!container) return;
  const success = document.createElement('div');
  success.className = 'notify-success';
  success.innerHTML = '🌸 감사합니다<p>서비스가 준비되면 가장 먼저 알려드릴게요.</p>';
  container.replaceChild(success, form);
}

document.querySelectorAll('[data-notify-form]').forEach((form) => {
  const status = form.querySelector('[data-notify-status]');
  const submit = form.querySelector('[data-notify-submit]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (form.email.value || '').trim();
    const consent = form.consent.checked;

    if (!EMAIL_RE.test(email)) {
      setStatus(status, '이메일 형식을 확인해 주세요.', true);
      return;
    }
    if (!consent) {
      setStatus(status, '수신 동의에 체크해 주세요.', true);
      return;
    }

    setStatus(status, '', false);
    submit.disabled = true;
    const originalLabel = submit.textContent;
    submit.textContent = '신청 중...';

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true }),
      });

      if (res.ok) {
        if (window.posthog) window.posthog.capture('notify_signup', { status: 'success' });
        showSuccess(form);
        return;
      }
      if (res.status === 409) {
        if (window.posthog) window.posthog.capture('notify_signup', { status: 'duplicate' });
        setStatus(status, '이미 신청해 주셨어요. 준비되면 알려드릴게요.', true);
      } else if (res.status === 400) {
        setStatus(status, '이메일 형식을 확인해 주세요.', true);
      } else {
        setStatus(status, '잠시 후 다시 시도해 주세요.', true);
      }
    } catch (_err) {
      setStatus(status, '잠시 후 다시 시도해 주세요.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = originalLabel;
    }
  });
});
```

- [ ] **Step 2: 브라우저에서 검증 로직만 수동 확인 (API 없이도 가능)**

Run:
```bash
npm run dev
```
브라우저에서 `http://localhost:8000` 열고 하단 CTA에서:
- 이메일 빈 채로 제출 → "이메일 형식을 확인해 주세요."
- 유효한 이메일 + 동의 체크 안 함 → "수신 동의에 체크해 주세요."
- 이메일 + 동의 후 제출 → API 미배포 상태면 "잠시 후 다시 시도해 주세요." (fetch 실패, 예상된 동작).

Ctrl+C로 서버 종료.

- [ ] **Step 3: 커밋**

```bash
git add main.js
git commit -m "feat: 출시 알림 폼 제출 로직 추가"
```

---

### Task 6: Vercel Serverless Function — `api/subscribe.js`

**Files:**
- Create: `api/subscribe.js`

**Interfaces:**
- Consumes: env vars `STIBEE_API_KEY`, `STIBEE_LIST_ID`.
- Produces: `POST /api/subscribe`, JSON 입력 `{ email, consent }`, JSON 출력 `{ status: 'ok' | 'duplicate' | 'invalid' | 'error' }`, HTTP 200/409/400/500.

**중요 — 구현자 확인 사항:** Stibee 공식 API 문서(<https://help.stibee.com/api>)에서 다음 3가지를 반드시 재확인한다:
1. 구독자 추가 엔드포인트 URL 형식 (아래 코드는 `https://api.stibee.com/v1/lists/{listId}/subscribers` 기준).
2. 인증 헤더명 (`AccessToken` 사용 중).
3. 중복 이메일 시 응답 상태·메시지 (아래 코드는 응답 JSON의 `Ok === false` + 메시지에 "이미" 포함으로 판정).

- [ ] **Step 1: 파일 생성**

`api/subscribe.js`:

```js
// Vercel Serverless Function: POST /api/subscribe
// Adds email to Stibee mailing list.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (chunk) => { buf += chunk; });
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function send(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { status: 'method_not_allowed' });
  }

  const { STIBEE_API_KEY, STIBEE_LIST_ID } = process.env;
  if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
    return send(res, 500, { status: 'error' });
  }

  let body;
  try { body = await readJson(req); }
  catch { return send(res, 400, { status: 'invalid' }); }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const consent = body.consent === true;
  if (!EMAIL_RE.test(email) || !consent) {
    return send(res, 400, { status: 'invalid' });
  }

  const endpoint = `https://api.stibee.com/v1/lists/${encodeURIComponent(STIBEE_LIST_ID)}/subscribers`;
  const payload = {
    eventOccurredBy: 'SUBSCRIBER',
    confirmEmailYN: 'N',
    subscribers: [{ email }],
  };

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json().catch(() => ({}));

    if (upstream.ok && data && data.Ok !== false) {
      return send(res, 200, { status: 'ok' });
    }

    const msg = typeof data?.Message === 'string' ? data.Message : '';
    if (msg.includes('이미') || upstream.status === 409) {
      return send(res, 409, { status: 'duplicate' });
    }
    return send(res, 500, { status: 'error' });
  } catch {
    return send(res, 500, { status: 'error' });
  }
}
```

**로깅 주의:** 이 코드는 이메일을 어떤 로그에도 출력하지 않는다. 디버깅 시에도 이메일 원문을 로그에 남기지 말 것.

- [ ] **Step 2: 정적 문법 오류 확인**

Run: `node --check api/subscribe.js`
Expected: 출력 없음 (문법 정상).

- [ ] **Step 3: `vercel dev`가 있으면 로컬 E2E 검증 (선택)**

Run:
```bash
vercel dev --listen 3000
```
다른 터미널에서:
```bash
# env 없으면 500 반환 예상
curl -i -X POST http://localhost:3000/api/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","consent":true}'

# 잘못된 페이로드 → 400
curl -i -X POST http://localhost:3000/api/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"nope"}'

# GET → 405
curl -i http://localhost:3000/api/subscribe
```

`vercel dev`가 없으면 이 단계는 건너뛰고 Task 8에서 Preview 배포로 검증.

- [ ] **Step 4: 커밋**

```bash
git add api/subscribe.js
git commit -m "feat: Stibee 구독 API 서버리스 함수 추가"
```

---

### Task 7: 개인정보처리방침 업데이트 (한/영)

**Files:**
- Modify: `privacy/index.html`

**Interfaces:**
- 없음 (문서 변경).

- [ ] **Step 1: 한글 — 제1조 수집 항목에 이메일 추가**

`privacy/index.html`의 한글 제1조 블록(24~50라인) 안, `<p>서비스는 만 14세 미만 아동의 개인정보를 수집하지 않습니다.</p>` **바로 위**에 아래 블록을 삽입:

```html
        <p><strong>출시 알림 신청 정보 (웹사이트)</strong></p>
        <ul>
          <li>이메일 주소</li>
        </ul>
```

- [ ] **Step 2: 한글 — 제2조 이용 목적에 항목 추가**

한글 제2조 `<ul>`(55~60라인)의 마지막 `<li>` 다음에 항목 추가:

```html
          <li>서비스 출시 알림 및 관련 안내 이메일 발송(웹사이트에서 신청한 이용자에 한함)</li>
```

- [ ] **Step 3: 한글 — 제3조 보유 기간에 항목 추가**

한글 제3조 `<ul>` 안에 다음 `<li>` 추가:

```html
          <li>출시 알림 신청 이메일: 수신 거부 요청 시 또는 서비스 종료 시까지</li>
```

- [ ] **Step 4: 한글 — 제4조 위탁 표에 Stibee 행 추가**

한글 제4조 `<tbody>` 안 마지막 `<tr>` 다음에 추가:

```html
            <tr>
              <td>스티비 주식회사 (Stibee)</td>
              <td>출시 알림 이메일 발송 및 구독자 관리</td>
            </tr>
```

- [ ] **Step 5: 영문 — Article 1에 이메일 항목 추가**

영문 Article 1(182~208라인) 안, `<p>The Service does not knowingly collect personal information from children under the age of 14.</p>` **바로 위**에 삽입:

```html
          <p><strong>Launch Notification Signup (Website)</strong></p>
          <ul>
            <li>Email address</li>
          </ul>
```

- [ ] **Step 6: 영문 — Article 2 목적에 항목 추가**

영문 Article 2 `<ul>` 마지막에 추가:

```html
            <li>Sending launch announcements and related notices to users who subscribed on the website</li>
```

- [ ] **Step 7: 영문 — Article 3 보유 기간 항목 추가**

영문 Article 3 `<ul>`에 추가:

```html
            <li>Launch notification signup email: Until unsubscribe request or service termination</li>
```

- [ ] **Step 8: 영문 — Article 4 위탁 표에 Stibee 행 추가**

영문 Article 4 `<tbody>` 마지막에 추가:

```html
              <tr>
                <td>Stibee Inc.</td>
                <td>Launch notification email delivery and subscriber management</td>
              </tr>
```

- [ ] **Step 9: 빌드 & 검증**

Run:
```bash
npm run build
grep -c "스티비" dist/privacy/index.html
grep -c "Stibee" dist/privacy/index.html
```
Expected: 각각 `1` 이상.

- [ ] **Step 10: 커밋**

```bash
git add privacy/index.html
git commit -m "docs(privacy): 출시 알림 이메일 수집 조항 추가 (한/영)"
```

---

### Task 8: 종단 검증 (Vercel Preview + 실이메일)

**Files:**
- 없음 (수동 검증 단계).

**전제:** 사용자가 Stibee 계정을 만들어 (a) 주소록 생성, (b) API 키 발급, (c) 발신자 이메일 인증 완료. Vercel 프로젝트 대시보드에 `STIBEE_API_KEY`, `STIBEE_LIST_ID` env 설정(Production + Preview).

- [ ] **Step 1: 사전 환경 확인**

Vercel 대시보드에서 두 env 값이 Production/Preview 스코프로 모두 설정되었는지 확인.

- [ ] **Step 2: Preview 배포**

Run:
```bash
git push
```
Vercel이 Preview URL을 자동 발급. GitHub PR을 안 만들었다면 `vercel --prebuilt` 또는 대시보드에서 직접 배포. 배포 완료 후 URL을 받는다.

- [ ] **Step 3: 시나리오 1 — 신규 이메일 성공**

Preview URL 접속 → 하단 CTA에서 실제 확인 가능한 이메일 입력, 동의 체크, "알림 신청" 클릭.
Expected: 폼이 성공 메시지로 교체됨 (`🌸 감사합니다 ...`).
Stibee 대시보드에서 해당 이메일이 구독자에 등록되었는지 확인.

- [ ] **Step 4: 시나리오 2 — 중복 이메일**

동일 이메일로 다시 시도.
Expected: `이미 신청해 주셨어요. 준비되면 알려드릴게요.` 오류 메시지.

**주의:** 만약 이 시나리오가 실패(신규처럼 성공 처리 또는 다른 메시지)하면, `api/subscribe.js`의 중복 판정 로직(현재 `msg.includes('이미')` 및 `upstream.status === 409` 검사)이 실제 Stibee 응답과 맞지 않는 것이다. Preview 배포된 함수 로그(Vercel Dashboard → Functions → Logs, 이메일 값은 안 찍히지만 응답 status/message는 찍어도 됨—필요 시 임시로 `console.log(upstream.status, data?.Message)` 추가 후 확인, 확인 후 제거)를 보고 판정 조건을 조정.

- [ ] **Step 5: 시나리오 3 — 잘못된 이메일**

`abc` 같은 잘못된 값 입력 후 제출.
Expected: `이메일 형식을 확인해 주세요.` (클라이언트에서 차단).

- [ ] **Step 6: 시나리오 4 — 동의 미체크**

유효한 이메일 + 동의 체크 안 함으로 제출.
Expected: `수신 동의에 체크해 주세요.`.

- [ ] **Step 7: 시나리오 5 — 헤더·히어로 앵커 스크롤**

Preview 페이지에서 헤더 "출시 알림 받기" 및 히어로 "🔔 출시 알림 받기" 클릭 시 하단 CTA 섹션으로 부드러운 스크롤이 되는지 확인. 모바일 뷰포트에서도 확인.

- [ ] **Step 8: 시나리오 6 — 블로그 아티클 하단 CTA**

블로그 글이 있으면 Preview에서 임의 글 하나 열어 하단에 동일 CTA가 뜨는지 확인, 실제 이메일 제출도 정상 동작 확인.

- [ ] **Step 9: Production 프로모트**

모든 시나리오 통과 시 Vercel 대시보드에서 Preview를 Production으로 프로모트하거나 `main` 브랜치 push로 프로덕션 배포. 프로덕션에서 시나리오 1을 한 번 더 반복해 실제 등록 확인.

- [ ] **Step 10: 정리 커밋 (변경 없으면 스킵)**

Task 4의 판정 조건 튜닝 등 코드 변경이 있었다면:
```bash
git add api/subscribe.js
git commit -m "fix: Stibee 응답 판정 조건 실제 응답 기준으로 보정"
```

---

## 자체 검토 (Self-Review)

**Spec coverage:**
- 아키텍처(Serverless + Stibee) → Task 6
- 하단 CTA UI/문구 → Task 1(CSS) + Task 2(HTML) + Task 3(연결)
- 헤더 라벨 → Task 4
- 히어로 단일 버튼 → Task 4
- 성공/에러 상태 4종 → Task 5
- 블로그 아티클 CTA 통일 → Task 3
- 개인정보처리방침 4개 지점 (한/영) → Task 7
- 옛 파셜 2종 삭제 → Task 3
- 종단 검증 → Task 8
- 로깅 금지 원칙 → Task 6 명시

**Placeholder scan:** 모든 스텝에 실제 코드/명령/기대 출력 있음. "TBD"/"TODO" 없음. Stibee API 세부는 문서 확인 후 반영 지시가 붙어 있지만 코드는 기본형이 채워져 있어 실행 가능 상태.

**Type/이름 일관성:** 클라이언트가 보내는 `{ email, consent }`와 서버가 파싱하는 필드 이름, `data-notify-form`/`data-notify-status`/`data-notify-submit` 셀렉터, HTTP 200/409/400 처리, 성공/에러 메시지 문구 — 태스크 간 일치.
