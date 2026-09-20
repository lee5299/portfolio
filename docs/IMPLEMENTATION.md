# Authentication implementation

## 1. 무엇으로 구현했나

- Node.js 22 이상과 Express 5
- `@simplewebauthn/server` 및 `@simplewebauthn/browser` 14
- Vanilla JavaScript와 esbuild
- 운영 저장소로 Supabase PostgreSQL, 로컬 자동 시험 저장소로 임시 JSON
- DB에서 원자적으로 소비하는 challenge와 해시된 불투명 서버 세션

## 2. 왜 선택했나

기존 페이지와 같은 JavaScript 생태계를 유지하면서 WebAuthn의 challenge, origin, RP ID, 공개키 서명과 counter 검증을 검증된 라이브러리에 맡긴다. Supabase는 Vercel 함수 사이에 인증 상태를 공유하고 트랜잭션으로 challenge 재사용과 동시 패스키 삭제를 막는다. Supabase Auth는 사용하지 않으며 패스키 검증과 세션 권한은 이 서버가 담당한다.

## 3. 어디를 어떻게 고쳤나

- **등록 옵션·검증:** `server/app.js`의 `/api/bootstrap/registration/options`, `/api/passkeys/registration/options`, `/api/passkeys/registration/verify`
- **로그인 옵션·검증:** `server/app.js`의 `/api/authentication/options`, `/api/authentication/verify`
- **로그아웃:** `server/app.js`의 `/api/logout`과 `server/postgres-state.js`의 세션 폐기
- **비공개 조회:** `server/app.js`의 `/api/private-items`, `/api/accounts/:accountId/private-items`
- **패스키 관리:** `server/app.js`의 `/api/passkeys` GET·DELETE
- **운영 저장:** `server/postgres-store.js`, `server/postgres-state.js`, `supabase/migrations/20260920000000_initial.sql`
- **로컬 시험 저장:** `server/store.js`, `server/ephemeral-state.js`
- **브라우저 흐름:** `client/app.js`
- **공개·비공개 화면:** `public/index.html`, `public/style.css`

운영 최초 등록은 로컬에서 만든 무작위 코드의 SHA-256 해시를 Vercel 환경변수에만 둔다. 원문 코드는 비밀번호 관리자에 보관한다. 첫 패스키가 생긴 계정은 같은 코드로 다시 최초 등록할 수 없다. 이후 패스키 추가는 인증 세션이 있어야 한다. JSON 기반 로컬 시험 모드에서는 서버 시작 때 임시 코드를 콘솔에 표시한다.

## 4. 안 열리는 것을 어떻게 확인했나

자동 시험 결과와 정제된 예시는 [TEST_EVIDENCE.md](TEST_EVIDENCE.md)에 있다. 실제 인증기 서명이 필요한 네 가지 실기 확인은 [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md)에 따라 수행하고 결과를 추가한다.

## 5. AI와 나

- **AI에게 맡긴 일:** 요구사항 구조화, 서버·클라이언트 구현, 자동 시험, 문서와 검증 절차 작성.
- **사용자가 직접 판단한 일:** Vercel + Supabase 사용, 마지막 패스키 삭제 차단, 실제 인증 자료의 Git 제외.
- **따르지 않은 AI 제안:** 아직 없음. 구현 도중 선택지는 문서 기준과 사용자가 확정한 제약에 맞춰 추천안을 적용했다.

## 6. 아직 못 막은 것

- 모든 등록 기기와 보안키를 잃으면 비밀번호 복구 수단이 없어 애플리케이션 UI로 계정을 복구할 수 없다.
- 운영 도메인/RP ID를 바꾸면 기존 패스키를 새 RP에 다시 등록해야 한다.
- Supabase 장애나 연결 한도 초과 시 로그인과 비공개 공간이 일시적으로 동작하지 않는다. 공개 정적 페이지는 계속 제공될 수 있다.
- 로컬 자동 시험은 Supabase 서비스 자체와 실제 인증기 서명을 만들지 않으므로 배포 도메인에서 통합·실기 확인이 필요하다.
- 자동 시험은 실제 기기 인증기의 서명을 만들지 않으므로 배포 도메인에서 실기 확인이 필요하다.

## Security behavior

- 모든 변경 API는 요청 `Origin`이 설정된 `APP_ORIGIN`과 정확히 같아야 한다.
- 세션 쿠키는 `HttpOnly`, `SameSite=Strict`이며 HTTPS 환경에서는 `Secure`를 사용한다.
- 등록·로그인 ceremony는 조건부 DB 갱신으로 즉시 소비되어 성공 여부와 관계없이 재사용할 수 없다.
- 비공개 자료는 세션의 계정 ID로만 범위를 결정한다. URL이나 본문의 다른 계정 ID를 신뢰하지 않는다.
- 패스키가 하나만 남으면 삭제를 `409 Conflict`로 거절한다.
