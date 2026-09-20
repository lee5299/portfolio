# 패스키로 보호하는 자기소개 페이지

공개 포트폴리오는 누구나 볼 수 있고, 별도의 개인 공간은 WebAuthn 패스키 인증 뒤에만 서버가 자료를 전달합니다. 비밀번호는 사용하지 않으며 운영 상태는 Supabase PostgreSQL에 저장합니다.

## Local start

Node.js 22 이상과 패스키를 지원하는 브라우저가 필요합니다.

```powershell
npm install
npm run build
npm start
```

기본 로컬 모드는 외부 서비스 없이 JSON 시험 저장소를 사용합니다. `http://localhost:3000`을 열고 서버 콘솔에 표시되는 `owner-demo` 등록 코드를 사용해 첫 패스키를 등록합니다.

첫 로그인 뒤에는 두 번째 패스키를 추가할 수 있습니다. 패스키가 하나만 남으면 삭제 요청은 `409 Conflict`로 차단됩니다.

## Production

Vercel + Supabase 설정, 미리 결정해야 할 도메인·Git 연결·Preview 정책과 복구 절차는 [DEPLOYMENT.md](docs/DEPLOYMENT.md)에 있습니다. 실제 연결 문자열이나 등록 코드를 소스 파일에 기록하지 마세요.

## Local runtime data

- 로컬 시험 패스키 공개키와 credential 정보: `runtime-data/store.json`
- 로컬 시험 challenge와 세션: 서버 메모리
- 정제 전 시험 기록: `evidence/raw/`

위 경로는 Git에서 제외됩니다. 실제 런타임 파일을 소스 저장소에 강제로 추가하지 마세요.

## Commands

- `npm test`: 서버 보안 경계와 정책 시험
- `npm run build`: 브라우저 JavaScript 번들 생성
- `npm run setup-code`: 운영 최초 등록 코드와 환경변수용 해시 생성
- `npm run start:supabase`: `.env.local`을 이용한 Supabase 연결 실행
- `pwsh ./scripts/validate-project.ps1`: 문서·설정·Git 제외 항목 검증
- `pwsh ./scripts/pre-deploy.ps1`: 배포 전 전체 검사

실제 기기 패스키 시험은 [VERIFICATION_GUIDE.md](docs/VERIFICATION_GUIDE.md)를 따릅니다. 구현 구조와 소스 위치는 [IMPLEMENTATION.md](docs/IMPLEMENTATION.md)에 정리되어 있습니다.
