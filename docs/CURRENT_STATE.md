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
- 기존 Production `https://portfoliovercel-beta-three.vercel.app`가 변경 전 정적 페이지를 `200 OK`로 제공하는 것을 확인했다.
- 새 Supabase 프로젝트 대신 Planner 프로젝트를 임시 공유하기로 했다. Planner와 격리된 `portfolio_passkey` 스키마와 `portfolio_passkey_app` 역할을 사용하도록 migration과 서버 쿼리를 변경했다.
- 현재 과제용 Vercel 패스키는 임시 자산으로 취급한다. 새 소개 페이지를 Planner origin에 통합할 때 기존 패스키를 이전하지 않고 새 RP ID에서 다시 등록한다.
- Planner Supabase에 migration을 적용했고 postflight 검사의 여섯 항목이 모두 `true`인 것을 확인했다.
- DB 역할의 평문 비밀번호가 SQL 기록에 남지 않도록 로컬 SCRAM 검증값 생성 절차를 마련했다.
- `portfolio_passkey_app` 로그인과 최소 권한 검사에서 `role_connection_ready = true`를 확인했다.
- Vercel Production에 `DATABASE_URL`, 고정 origin/RP 설정과 두 최초 등록 코드의 해시를 준비했다. 원문 비밀값은 Git과 문서에 기록하지 않았다.
- `scripts/pre-deploy.ps1`의 프로젝트 검증, 테스트 10개와 빌드가 통과했다.
- 환경변수가 일부만 있던 시점의 기존 `main` 재배포는 정적 페이지를 그대로 배포했으며, 확인 결과 공개 페이지는 `200`, 아직 없는 `/api/health`는 `404`였다.

## In progress

- 실제 기기에서 패스키 두 개를 등록하고 체크리스트용 요청·응답 및 화면 증거를 수집해야 한다.
- 기능 브랜치를 `main`에 반영해 Production 배포한 뒤 실제 기기 검증을 수행해야 한다.

## Next

1. 기능 브랜치를 `main`으로 병합해 Production에 배포한다.
2. `/api/health`, 공개 페이지와 비인증 `401`을 확인한다.
3. `docs/VERIFICATION_GUIDE.md`에 따라 실제 패스키 두 개와 비교 계정 패스키를 등록한다.
4. 실제 등록·로그인·삭제 흐름의 정제된 증거를 수집한다.
5. Planner 기존 앱의 정상 동작과 공유 DB 영향이 없는지 확인한다.

## Known risks and open questions

- 운영 origin과 RP ID는 현재 Vercel Production 주소로 확정했다. 나중에 Planner 주소로 통합하면 새 RP에서 패스키를 다시 등록해야 한다.
- 동기화형 패스키 두 개가 실질적으로 독립된 복구 수단인지 확인해야 한다.
- 실제 Supabase 연결 통합 시험은 기능 브랜치가 아직 Production에 배포되지 않아 수행하지 못했다.
- Planner와 과제용 포트폴리오는 DB 연결 수·용량·장애 영향을 공유한다. 과제 종료 후 Planner 통합 구조가 확정되면 임시 연결과 데이터를 정리해야 한다.
- 비밀번호나 별도 복구 수단이 없으므로 등록한 모든 기기·보안키를 실제로 분실하면 계정 복구가 불가능하다.
- 자동 시험은 실제 인증기 서명을 생성하지 않는다. 실제 장치 등록·서명과 삭제한 패스키 실패는 수동 검증이 필요하다.
