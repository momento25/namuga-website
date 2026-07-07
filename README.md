# namuga.app

`나무가 나뭇가지에게` 서비스의 공식 웹사이트 (홈 / 지원 / 개인정보처리방침 / 이용약관).

앱 저장소(`tree-to-branch`)에서 2026-07-07에 분리되었습니다. 순수 정적 HTML/CSS로 구성되어 있으며 빌드 단계는 없습니다.

## 구조

```
.
├── index.html            홈
├── style.css             공용 스타일
├── privacy/index.html    개인정보처리방침 (한/영)
├── support/index.html    지원 / FAQ
└── terms/index.html      이용약관
```

## 로컬 실행

정적 사이트이므로 어떤 정적 서버로든 열 수 있습니다. Python이 설치돼 있으면:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## 배포

Vercel에 정적 사이트로 배포됩니다. 프레임워크 프리셋: **Other**. 빌드 커맨드/출력 디렉토리 설정 없음(루트를 그대로 서빙).

- 커스텀 도메인: `namuga.app`
- 로컬 링크: `.vercel/project.json` (커밋 대상 아님)
- CLI 배포: 이 폴더에서 `vercel` (프리뷰) / `vercel --prod` (프로덕션)
- Git 연동 시 GitHub 리포지토리로 push하면 자동 배포됩니다.
