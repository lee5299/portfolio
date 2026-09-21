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
- 세션·ceremony 식별자는 해시로 저장하고 최초 등록과 마지막 패스키 삭제 경쟁 조건을 transaction advisory lock으로 보호했다.
- 기능 브랜치 검증 뒤 GitHub `lee5299/portfolio`의 `main`에 병합하고 Vercel Production에 배포했다.
- 배포 전 기존 정적 Production을 기준선으로 확인했고, 이후 패스키 서버 구현으로 교체했다.
- 새 Supabase 프로젝트 대신 Planner 프로젝트를 임시 공유하기로 했다. Planner와 격리된 `portfolio_passkey` 스키마와 `portfolio_passkey_app` 역할을 사용하도록 migration과 서버 쿼리를 변경했다.
- 현재 과제용 Vercel 패스키는 임시 자산으로 취급한다. 새 소개 페이지를 Planner origin에 통합할 때 기존 패스키를 이전하지 않고 새 RP ID에서 다시 등록한다.
- Planner Supabase에 migration을 적용했고 postflight 검사의 여섯 항목이 모두 `true`인 것을 확인했다.
- DB 역할의 평문 비밀번호가 SQL 기록에 남지 않도록 로컬 SCRAM 검증값 생성 절차를 마련했다.
- `portfolio_passkey_app` 로그인과 최소 권한 검사에서 `role_connection_ready = true`를 확인했다.
- Vercel Production에 `DATABASE_URL`, 고정 origin/RP 설정과 두 최초 등록 코드의 해시를 준비했다. 원문 비밀값은 Git과 문서에 기록하지 않았다.
- 초기 `scripts/pre-deploy.ps1` 검증 뒤 시험을 보강했고 현재 자동 시험 12개와 빌드가 통과한다.
- 환경변수가 일부만 있던 중간 배포의 실패 원인을 수정하고 현재 `/api/health` `200`을 확인했다.
- GitHub `main`과 Vercel Git 연결을 바로잡고 Express preset과 직접 진입점을 추가해 Production 배포를 완료했다.
- Production에서 공개 페이지와 health `200`, 비인증 비공개 API `401`, 보안 헤더와 공개 응답의 비공개 문구 부재를 확인했다.
- Supabase 전용 역할로 Transaction pooler 연결을 확인했고, `accounts` 권한을 넓히지 않도록 패스키 변경 동시성 잠금을 transaction advisory lock으로 수정했다.
- 자동 시험 12개와 배포 전 검사가 통과했다.
- 실제 owner 패스키 두 개와 peer 패스키를 등록했다. owner의 하나 삭제, 삭제 키 거절, 남은 키 로그인, 마지막 삭제 차단과 재등록을 확인했다.
- owner↔peer 실제 교차 접근이 양방향 모두 `403 ACCOUNT_SCOPE_REJECTED`로 거절됐다.
- 운영에서 서로 다른 로그인 challenge, 미등록 credential `401`, ceremony 재사용 `400`을 확인했다.
- 값 노출 없는 DB 증거에서 owner/peer passkey 수 2/1, 비공개 항목 수 3/3, 공개키 존재와 개인키·비밀번호 컬럼 부재를 확인했다.
- 패스키 등록 취소 뒤 저장 건수가 유지되고 기존 Planner 화면과 데이터 조회가 정상임을 확인했다.

## In progress

- 제출 시 사용할 화면에서 최초 실패 때 노출된 setup code 화면을 제외하고 정제된 증거만 선택해야 한다.

## Next

1. 제출 스크린샷에서 setup code, credential ID, 공개키 원문, 쿠키와 토큰이 없는지 최종 확인한다.
2. 결과물 URL과 소스 URL을 제출 양식에 입력한다.

## Known risks and open questions

- 운영 origin과 RP ID는 현재 Vercel Production 주소로 확정했다. 나중에 Planner 주소로 통합하면 새 RP에서 패스키를 다시 등록해야 한다.
- 동기화형 패스키 두 개가 실질적으로 독립된 복구 수단인지 확인해야 한다.
- 실제 assertion 원문은 비밀값 노출을 피하기 위해 증거로 보관하지 않았다. 동일 ceremony 재전송 거절과 실제 성공·실패 로그를 조합해 일회성 검증을 입증한다.
- Planner와 과제용 포트폴리오는 DB 연결 수·용량·장애 영향을 공유한다. 과제 종료 후 Planner 통합 구조가 확정되면 임시 연결과 데이터를 정리해야 한다.
- 비밀번호나 별도 복구 수단이 없으므로 등록한 모든 기기·보안키를 실제로 분실하면 계정 복구가 불가능하다.
- 자동 시험은 실제 인증기 서명을 생성하지 않으므로 WebAuthn 라이브러리 변경이나 RP 이전 때 실제 장치 시험을 다시 수행해야 한다.
