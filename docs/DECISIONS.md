# Decisions

## 2026-09-20 — 공개 페이지와 비공개 자료의 서버 경계

- **Context:** 기존 자기소개 페이지는 누구나 볼 수 있어야 하지만 새 개인 공간은 인증된 소유자만 볼 수 있어야 한다.
- **Decision:** 공개 콘텐츠는 인증 없이 제공하고 비공개 자료는 인증·소유권 검사를 통과한 API에서만 반환한다. 비공개 자료를 공개 HTML이나 JavaScript에 넣고 CSS로 숨기지 않는다.
- **Alternatives considered:** 단일 정적 페이지에서 표시 여부만 전환하는 방식.
- **Consequences:** 실제 서버와 저장소가 필요하지만 비인증 응답과 페이지 소스에 비공개 내용이 노출되지 않는다.

## 2026-09-20 — 비밀번호 없는 WebAuthn 인증

- **Context:** 사용자는 비밀번호를 만들지 않고 기기가 보유한 패스키로만 로그인하기를 원한다.
- **Decision:** 등록과 로그인에 WebAuthn 패스키만 사용한다. 서버는 공개키와 검증 메타데이터를 저장하며 매 요청에 새 challenge를 발급하고 사용·만료된 challenge를 거절한다.
- **Alternatives considered:** 비밀번호, 이메일 매직 링크, 소셜 OAuth.
- **Consequences:** HTTPS와 정확한 origin/RP ID 설정이 필요하다. 모든 패스키를 잃으면 별도 복구 수단이 없으므로 두 개 이상의 패스키 등록과 마지막 패스키 정책이 중요하다.

## 2026-09-20 — 계정별 권한은 인증 상태에서 결정

- **Context:** 공격자가 URL이나 요청 본문의 계정 식별자를 바꿔 다른 계정 자료를 요청할 수 있다.
- **Decision:** 모든 비공개 자료 조회와 변경은 서버가 검증한 인증 상태의 계정 ID로 범위를 제한한다. 클라이언트가 보낸 계정 ID를 권한 근거로 신뢰하지 않는다.
- **Alternatives considered:** 요청에서 받은 계정 ID를 조회 조건으로 직접 사용하는 방식.
- **Consequences:** 두 시험 계정의 교차 접근을 양방향으로 검증할 수 있고 IDOR 유형의 노출을 막는다.

## 2026-09-20 — 제출 증거는 익명화하고 비밀값을 제거

- **Context:** 인증 동작을 입증하는 요청·응답과 저장 데이터를 제출해야 하지만 실제 개인정보와 인증 비밀은 제출할 수 없다.
- **Decision:** 가상 데이터만 사용하고 쿠키·세션·토큰·운영 비밀값은 증거에서 가린다. challenge는 서로 다름과 재사용 거절을 확인할 수 있는 최소 정보만 표시한다.
- **Alternatives considered:** 개발 중 생성된 원본 로그와 실제 프로필 정보를 그대로 제출하는 방식.
- **Consequences:** 증거 수집 시 정제 단계가 필요하지만 개인정보 노출과 세션 탈취 위험을 줄인다.

## 2026-09-20 — Supabase PostgreSQL로 운영 상태 저장

- **Context:** 사용자가 Vercel 배포를 선택한 뒤 Supabase 사용으로 기존 DB 미사용 제약을 변경했다. Vercel 함수의 임시 파일과 인스턴스 메모리는 인증 상태의 영속·공유 저장소로 사용할 수 없다.
- **Decision:** 운영 환경에서는 계정, 패스키 공개키, 비공개 항목, challenge와 해시된 세션을 Supabase PostgreSQL에 저장한다. Vercel 함수는 Transaction pooler로만 연결하고 브라우저에는 Supabase 키나 연결 문자열을 전달하지 않는다. 로컬 자동 시험에는 격리된 JSON 저장소를 계속 사용한다.
- **Alternatives considered:** 별도 영속 볼륨 서버, Vercel Blob, Redis/KV.
- **Consequences:** Vercel의 수평 실행에서도 challenge 재사용과 세션 상태를 일관되게 막을 수 있다. Supabase 프로젝트, migration, 연결 비밀 관리와 백업 절차가 필요하다.

## 2026-09-20 — 마지막 패스키 삭제 차단

- **Context:** 비밀번호와 별도 계정 복구 수단이 없으므로 마지막 패스키를 삭제하면 사용자가 다시 로그인할 수 없다.
- **Decision:** credential이 하나만 남은 계정의 삭제 요청을 `409 Conflict`로 거절한다. UI는 새 패스키를 먼저 등록하라고 안내한다. 운영에서는 계정 행 잠금 트랜잭션, 로컬 시험에서는 직렬화된 파일 변경 안에서 개수 확인과 삭제를 수행한다.
- **Alternatives considered:** 경고 후 마지막 패스키 삭제 허용, 관리자 복구 수단 제공.
- **Consequences:** 정상 UI와 API를 통해 패스키가 0개인 계정을 만들 수 없다. PostgreSQL 계정 행 잠금으로 동시 삭제도 직렬화한다. 계정 삭제가 필요하면 별도 절차로 설계해야 한다.

## 2026-09-20 — 운영 도메인을 패스키 등록 전에 확정

- **Context:** WebAuthn 패스키는 RP ID에 묶이며 Vercel Preview URL은 배포마다 달라질 수 있다.
- **Decision:** 실제 패스키는 안정적인 Production 도메인에서만 등록한다. Preview 배포에서는 인증 실기 시험을 하지 않으며, 필요하면 고정된 별도 Preview 도메인과 별도 Supabase 프로젝트를 마련한다.
- **Alternatives considered:** 요청 호스트를 RP ID와 origin으로 자동 신뢰하는 방식.
- **Consequences:** 임의 Host 헤더나 Preview URL을 신뢰하는 위험을 피한다. 운영 도메인을 나중에 변경하면 새 도메인에서 패스키를 다시 등록해야 한다.

## 2026-09-20 — Planner Supabase 프로젝트를 임시 공유

- **Context:** 별도 Supabase 프로젝트를 바로 만들지 않고 기존 Planner 프로젝트의 DB 자리를 임시로 사용한다.
- **Decision:** `portfolio_passkey` 전용 스키마와 `portfolio_passkey_app` 전용 로그인 역할을 사용한다. 모든 SQL은 스키마를 명시하고 Planner의 기존 스키마·테이블·역할·API 키를 변경하지 않는다.
- **Alternatives considered:** 포트폴리오 전용 Supabase 프로젝트, Planner의 `public` 스키마에 접두사 테이블 생성.
- **Consequences:** 이름과 권한 충돌을 줄이고 나중에 스키마 단위로 제거하거나 Planner에 정식 편입할 수 있다. 연결 한도, 저장 용량, 백업과 장애 범위는 Planner와 공유하므로 과제 단계에서는 가상 데이터만 사용한다.

## 2026-09-20 — 과제용 패스키는 Planner 통합 때 재등록

- **Context:** 현재 Vercel origin과 추후 Planner origin은 다르며 WebAuthn credential은 RP ID에 묶인다.
- **Decision:** 현재 도메인에서 등록한 패스키는 과제 검증용으로만 사용한다. 새 소개 페이지를 Planner에 통합할 때 최종 Planner origin과 RP ID를 설정하고 패스키 두 개를 새로 등록한다.
- **Alternatives considered:** 현재 패스키를 다른 도메인으로 이전, `vercel.app`을 공용 상위 RP ID로 사용.
- **Consequences:** 현재 credential을 최종 서비스로 가져갈 수 없지만 도메인 경계를 올바르게 유지한다. 전환 후 임시 passkey·session·ceremony 레코드를 삭제해야 한다.

## 2026-09-20 — 패스키 런타임 정보는 Git에서 제외

- **Context:** 공개키 자체는 비밀키가 아니지만 credential ID, counter, transport, 계정 연결 정보와 함께 실제 인증 시스템의 운영 데이터다.
- **Decision:** 운영 패스키 런타임 정보는 Supabase에만 저장한다. 로컬 시험 정보는 `runtime-data/`에 저장하고 Git에서 제외한다. 정제 전 요청·응답은 `evidence/raw/`에 두며 이 경로도 제외한다. 프로젝트 검증 스크립트는 해당 로컬 파일이 추적되면 실패한다.
- **Alternatives considered:** 공개키이므로 소스 저장소에 예시 데이터와 함께 저장하는 방식.
- **Consequences:** 개발 환경을 새로 만들 때 실제 패스키를 다시 등록해야 한다. 제출용 예시는 실제 값 대신 형식만 보여 주는 가상 또는 마스킹 데이터로 작성한다.

## 2026-09-20 — Node.js와 SimpleWebAuthn 사용

- **Context:** 기존 소개 페이지가 HTML·CSS·JavaScript로 작성됐고 WebAuthn 검증 과정을 소스와 요청·응답으로 보여 줘야 한다.
- **Decision:** Node.js 22 이상, Express 5, `@simplewebauthn/server`와 `@simplewebauthn/browser` 14를 사용한다. 브라우저 코드는 esbuild로 번들한다.
- **Alternatives considered:** Python 서버와 WebAuthn 라이브러리, 외부 인증 서비스.
- **Consequences:** 클라이언트와 서버를 같은 언어로 유지하고 등록·인증 검증을 검증된 라이브러리에 맡긴다. 운영에는 Node.js 함수를 실행하는 Vercel과 공유 상태를 제공하는 Supabase가 필요하다.

## 2026-09-21 — DB 역할 비밀번호는 SCRAM 검증값으로 설정

- **Context:** Supabase SQL Editor에서 평문을 포함한 `ALTER ROLE`을 실행하면 비밀번호가 쿼리 기록이나 서버 로그에 남을 수 있다.
- **Decision:** 로컬 스크립트가 무작위 DB 비밀번호와 PostgreSQL SCRAM-SHA-256 검증값을 함께 만든다. 사용자는 원문을 비밀번호 관리자와 Vercel에만 저장하고 SQL Editor에는 검증값이 포함된 명령만 실행한다.
- **Alternatives considered:** SQL Editor에 평문 입력, PostgreSQL 클라이언트를 별도로 설치해 `\\password` 실행.
- **Consequences:** 추가 프로그램 설치 없이 평문을 SQL 기록에서 제외할 수 있다. SCRAM 검증값도 인증 자료이므로 Git에 커밋하거나 장기 보관하지 않는다.
