# Current state

## Completed

- 기존 공개 자기소개 페이지의 HTML, CSS, JavaScript 초안이 별도 작업 경로에 있다.
- 패스키로 보호하는 비공개 공간의 목표와 완주 기준을 문서화했다.
- 세부 T08 기준을 요구사항, 설계와 실행 체크리스트로 연결했다.
- 공개/비공개 서버 경계, WebAuthn 전용 인증, 계정별 권한 및 증거 익명화 결정을 기록했다.
- 배포 환경을 Vercel로, 운영 저장소를 Supabase PostgreSQL로 확정했다.
- 마지막 패스키가 하나 남으면 삭제 요청을 `409 Conflict`로 차단하기로 확정했다.
- 패스키 런타임 정보는 `runtime-data/`에만 두고 Git 추적을 차단하도록 ignore 규칙과 검증을 추가했다.
- Express와 SimpleWebAuthn으로 등록·로그인·로그아웃 API를 구현했다.
- 공개 소개와 서버에서만 반환되는 비공개 항목을 화면에서 분리했다.
- 패스키 목록·추가·삭제 및 마지막 한 개 삭제 `409 Conflict` 정책을 구현했다.
- 두 가상 계정의 소유권 검사, challenge 일회성 처리와 세션 관리를 구현했다.
- 자동 시험과 브라우저 데스크톱·모바일 화면 검증을 완료했다.
- Supabase 스키마 migration, Transaction pooler 연결, DB 기반 challenge·세션과 Vercel Express 진입점을 구현했다.
- 세션·ceremony 식별자는 해시로 저장하고 최초 등록과 마지막 패스키 삭제 경쟁 조건을 트랜잭션 잠금으로 보호했다.
- GitHub `lee5299/portfolio`의 `feat/passkey-private-area` 브랜치에 검증된 구현을 push했다. `main`과 기존 Vercel Production은 아직 변경하지 않았다.

## In progress

- 실제 기기에서 패스키 두 개를 등록하고 체크리스트용 요청·응답 및 화면 증거를 수집해야 한다.
- Supabase와 Vercel 프로젝트를 만들고 운영 도메인 및 RP ID를 확정해야 한다.

## Next

1. `docs/VERIFICATION_GUIDE.md`에 따라 실제 패스키 두 개와 비교 계정 패스키를 등록한다.
2. 실제 등록·로그인·삭제 흐름의 정제된 증거를 수집한다.
3. `docs/DEPLOYMENT.md` 순서로 Supabase migration과 Vercel 환경변수를 적용한다.
4. 기능 브랜치의 Preview 상태를 확인하고 준비가 끝나면 `main`으로 병합한다.
5. 최종 운영 도메인과 RP ID로 배포한 뒤 같은 실기 검증을 반복한다.

## Known risks and open questions

- 최종 운영 도메인과 운영 RP ID가 아직 정해지지 않았다. 도메인을 바꾸면 기존 패스키를 새 RP에서 다시 등록해야 한다.
- 동기화형 패스키 두 개가 실질적으로 독립된 복구 수단인지 확인해야 한다.
- 실제 Supabase 연결 통합 시험은 프로젝트와 비밀 연결 문자열이 아직 없어 수행하지 못했다.
- 비밀번호나 별도 복구 수단이 없으므로 등록한 모든 기기·보안키를 실제로 분실하면 계정 복구가 불가능하다.
- 자동 시험은 실제 인증기 서명을 생성하지 않는다. 실제 장치 등록·서명과 삭제한 패스키 실패는 수동 검증이 필요하다.
