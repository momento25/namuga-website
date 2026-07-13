# 출시 알림 이메일 CTA — 설계 문서

- 작성일: 2026-07-13
- 대상: `namuga.app` 홈페이지
- 상태: 승인됨, 구현 대기

## 배경

앱은 아직 미출시(2026-07 베타 예정). 현재 사이트의 앱 다운로드 버튼들은
`site.config.js`의 `appStoreUrl: '#'`, `playStoreUrl: '#'`로 걸려 있어 눌러도
아무 일이 일어나지 않는 상태다. 방문자 신뢰가 손상되고, 초기 관심 유저를
잡을 수단이 없다.

이 문서는 하단 CTA를 이메일 기반 "출시 알림 신청"으로 교체하고, 관련
버튼들의 라벨을 정직하게 정리하는 변경을 정의한다.

## 목표

- 방문 시점에 관심 유저의 이메일을 수집해 베타 오픈 시 알림 발송
- Dead link 상태의 다운로드 버튼을 의미 있는 CTA로 대체
- 베타 출시 이후에도 발송 채널로 재활용 가능한 이메일 리스트 확보

## 비목표

- 이 스코프에서 새 페이지, 새 섹션 신설 없음
- 관리자 화면 자체 구현 없음 (Stibee 대시보드 사용)
- 발송 자동화 없음 (첫 발송은 베타 오픈 시 수동)

## 이해관계자 결정 요약

| 항목 | 결정 |
|---|---|
| 이메일 저장·발송 | 뉴스레터 서비스 (수집+발송 통합) |
| 서비스 | **Stibee** (한국, 국내 서버) |
| 하단 CTA 처리 | 이메일 폼으로 **완전 교체** |
| 히어로 다운로드 버튼 | 라벨/링크 정리, `#download` 스크롤 유지 |
| 폼 필드 | **이메일만** + 수신 동의 체크박스 |
| 히어로 버튼 스타일 | 단일 primary 버튼 (앱스토어 뱃지 스타일 폐기) |

## 아키텍처

```
Browser (form submit)
        │
        │  POST /api/subscribe  { email, consent }
        ▼
Vercel Serverless Function (api/subscribe.js)
        │
        │  Stibee API (AccessToken 헤더)
        ▼
Stibee 주소록
```

**왜 Serverless Function을 끼우는가:**

- Stibee API 키를 서버 사이드에 두어 브라우저 노출 방지
- 폼 UI를 사이트 디자인에 완전 커스텀
- 페이지 이동 없이 인라인 성공/실패 UX 제공
- Vercel은 `api/` 경로 파일을 자동으로 함수로 배포하므로 별도 설정 불필요

**환경 변수 (배포 전 Vercel 대시보드에서 설정):**

- `STIBEE_API_KEY` — Stibee 계정에서 발급받은 API 키
- `STIBEE_LIST_ID` — 대상 주소록 ID

## UI 설계

### 하단 CTA (홈 & 블로그 아티클 공통)

기존 초록색 `.cta-block` 스타일 유지, 내부 컨텐츠만 교체.

```
┌─ .cta-block (초록 배경) ────────────────────────────┐
│                                                    │
│           앱 출시를 가장 먼저 알려드릴게요             │
│                                                    │
│    준비되는 대로 소식을 이메일로 전해드릴게요.          │
│                                                    │
│   ┌──────────────────────────┐  ┌──────────────┐  │
│   │ your@email.com           │  │ 알림 신청     │  │
│   └──────────────────────────┘  └──────────────┘  │
│                                                    │
│   ☐ 출시 알림 이메일 수신에 동의합니다.               │
│     개인정보처리방침 보기                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

- 데스크탑: 인풋 + 버튼 가로 배치, 체크박스는 그 아래
- 모바일: 인풋 → 버튼 → 체크박스 세로 스택

**상태 전이:**

- **초기**: 폼 노출
- **제출 중**: 버튼 `disabled`, 라벨 "신청 중..."
- **성공**: 폼 자리를 성공 메시지로 대체
  - 문구: "🌸 감사합니다 — 서비스가 준비되면 가장 먼저 알려드릴게요."
- **실패**: 폼 유지, 아래 상태 메시지 표시 (aria-live)
  - 이메일 형식: `이메일 형식을 확인해 주세요.`
  - 동의 미체크: `수신 동의에 체크해 주세요.`
  - 중복(409): `이미 신청해 주셨어요. 준비되면 알려드릴게요.`
  - 네트워크/서버(5xx): `잠시 후 다시 시도해 주세요.`

### 헤더 (`_partials/header.html`)

- 데스크탑 우측 버튼 라벨: `앱 다운로드` → **`출시 알림 받기`**
- 모바일 메뉴 하단 CTA: 동일하게 변경
- `href`는 `#download` 유지 (하단 CTA로 스크롤)

### 히어로 (`_partials/download-buttons.html`)

- App Store / Google Play 두 개 뱃지 버튼 삭제
- 단일 primary 버튼으로 대체: **"🔔 출시 알림 받기"**, `href="#download"`
- 히어로 note 문구: "iOS · Android 무료 · 첫 질문은 오늘 바로"
  → "iOS · Android · 곧 만나요"

## 폼 사양

### HTML 구조 (요약)

```html
<form data-notify-form novalidate>
  <div class="notify-input-row">
    <label class="sr-only" for="notify-email">이메일</label>
    <input id="notify-email" type="email" name="email" required
           autocomplete="email" placeholder="your@email.com">
    <button type="submit" class="btn btn-notify">알림 신청</button>
  </div>
  <label class="notify-consent">
    <input type="checkbox" name="consent" required>
    <span>출시 알림 이메일 수신에 동의합니다.
      <a href="/privacy/">개인정보처리방침 보기</a></span>
  </label>
  <p class="notify-status" role="status" aria-live="polite"></p>
</form>
```

### 클라이언트 동작 (`main.js` 확장)

1. `submit` 이벤트에서 `preventDefault()`
2. 이메일 형식 확인, 동의 체크 확인 — 실패 시 상태 메시지 후 종료
3. 버튼 `disabled`, 라벨을 "신청 중..."으로 변경
4. `fetch('/api/subscribe', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, consent: true }) })`
5. 응답 상태별 UX 처리
6. 성공 시 폼을 성공 블록으로 스왑
7. PostHog가 있는 환경이면 `posthog.capture('notify_signup', { status: 'success' | 'duplicate' | 'error' })`

### 서버 함수 (`api/subscribe.js`)

- Vercel Node.js Function (기본 Fluid Compute)
- 허용 메서드: `POST`만 (그 외는 405)
- 검증:
  - `email`: RFC 5321 간이 정규식
  - `consent`: 반드시 `true` — 아니면 400
- Stibee API 호출 (공식 문서 기준으로 구현 시 확정, 일반적으로 `AccessToken` 헤더 + subscribers 배열 페이로드)
- 매핑:
  - 신규 등록 → 200 `{ status: 'ok' }`
  - 이미 존재 → 409 `{ status: 'duplicate' }`
  - 클라이언트 오류 → 400
  - 그 외 → 500
- **개인정보 로깅 금지**: 이메일 원문을 stdout / 외부 로그에 남기지 않는다.

## 개인정보처리방침 업데이트

`privacy/index.html`의 한글/영문 섹션 양쪽에 반영.

- **제1조 수집 항목**: "출시 알림 신청 시 이메일 주소" 추가 항목 신설
- **제2조 이용 목적**: "서비스 출시 알림 및 관련 안내 이메일 발송" 추가
- **제3조 보유 기간**: "출시 알림 신청 이메일 — 수신 거부 요청 또는 서비스 종료 시까지" 추가
- **제4조 처리 위탁 표**: `스티비 주식회사 (Stibee)` — `이메일 발송 및 구독자 관리` 행 추가
- **제4조의2 국외 이전**: Stibee는 국내 서버이므로 조항 변경 없음
- 영문 섹션에도 대응 표현 추가

## 파일 변경 목록

### 신규

- `_partials/cta-notify.html` — 이메일 CTA 블록 (홈+블로그 공용)
- `api/subscribe.js` — Vercel Serverless Function

### 수정

- `_partials/header.html` — 버튼 라벨 2곳
- `_partials/download-buttons.html` — 두 뱃지 → 단일 primary 버튼
- `index.html` — `@include:cta-download` → `@include:cta-notify`, 히어로 note 문구
- `build.mjs` — 블로그 아티클 CTA 블록을 `@include:cta-notify`로 통일
- `style.css` — `.notify-input-row`, `.notify-consent`, `.notify-status`, 성공 상태 등 신규 스타일
- `main.js` — 폼 제출 핸들러 추가
- `privacy/index.html` — 위 조항 4개 지점 반영 (한/영)

### 삭제

- `_partials/cta-download.html` — `cta-notify.html`로 대체
- `_partials/download-buttons-on-dark.html` — 다른 사용처 없음

### Vercel 환경 변수

- `STIBEE_API_KEY`
- `STIBEE_LIST_ID`

## 사전 준비 (사용자 작업)

구현 전에 사용자가 직접 처리:

1. Stibee 계정 생성 및 발신자 이메일 인증
2. 주소록 1개 생성 → List ID 확보
3. API 키 발급
4. Vercel 프로젝트에 두 env 값 설정 (Production + Preview)

## 롤아웃 계획

1. 구현 & 로컬 빌드 확인
2. Vercel Preview 배포에서 실제 이메일로 종단 테스트 (신규/중복/오류)
3. Production 프로모트
4. 헤더 "출시 알림 받기" 버튼과 히어로 CTA가 모두 하단 폼으로 스크롤되는지 실기기 확인

## 베타 출시 이후 (스코프 밖, 참고)

- 하단 CTA를 실제 다운로드 버튼으로 교체 (또는 두 개를 병치)
- 수집된 이메일 리스트로 Stibee에서 "베타 오픈" 발송
- 리스트는 이후 신기능/새 질문 안내 발송 채널로 계속 활용

## 오픈 이슈 / 결정 유보

없음. 구현 시 Stibee API의 정확한 필드명/헤더는 공식 문서로 확인 후 반영한다.
