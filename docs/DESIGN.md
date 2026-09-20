# Design

## Architecture

```text
방문자 브라우저
  ├─ 공개 페이지 요청 ───────────────▶ 공개 정적 콘텐츠
  ├─ WebAuthn 등록/로그인 ──────────▶ Vercel Express 함수 ──▶ Supabase PostgreSQL
  └─ 인증된 비공개 자료 요청 ───────▶ 해시 세션·소유권 검사 ──▶ 비공개 항목
                                                    └──────▶ 패스키 공개키 레코드
```

공개 페이지는 인증 없이 제공한다. 비공개 자료는 공개 HTML이나 JavaScript 번들에 포함하지 않고 인증된 API가 로그인 뒤에만 반환한다. 화면에서 요소를 숨기는 것은 보안 경계로 사용하지 않는다.

## Data and integrations

운영 상태는 Supabase PostgreSQL에 저장한다. Vercel의 Express 함수만 `DATABASE_URL`로 연결하며 브라우저 번들에는 Supabase URL, 키 또는 연결 문자열이 없다. 로컬 자동 시험은 외부 서비스 없이 실행하기 위해 임시 JSON 저장소와 메모리 상태 구현을 사용한다.

- **Account:** 내부 사용자 ID와 생성 시각. 실제 이름·이메일을 시험 데이터에 사용하지 않는다.
- **PasskeyCredential:** 계정 ID, credential ID, 공개키, 서명 카운터, 사람이 읽을 수 있는 이름, 등록 시각과 필요한 전송 방식 메타데이터.
- **Challenge:** 해시된 ceremony ID, challenge, 용도(등록/로그인), 연결된 절차, 만료·소비 시각.
- **PrivateItem:** 소유 계정 ID, 가상 제목과 내용, 생성·수정 시각.
- **Session:** 데이터베이스에는 불투명 세션 ID의 SHA-256 해시, 인증된 계정 ID, 만료와 폐기 상태를 저장한다. 브라우저에는 `HttpOnly`, `Secure`, `SameSite=Strict` 쿠키로 원문 세션 ID만 전달한다.

서버에는 패스키 개인키가 들어갈 필드나 API가 없어야 한다.

### Database persistence rules

- `supabase/migrations/001_initial.sql`에는 테이블·인덱스·가상 초기 데이터만 둔다. 실제 credential ID, 공개키, counter, 세션, challenge와 연결 비밀은 Git에 넣지 않는다.
- 모든 테이블에 RLS를 켜고 `anon`, `authenticated`, `service_role` 역할 권한을 제거한다. 현재 애플리케이션은 Supabase Data API를 사용하지 않는다. Vercel은 다섯 테이블에만 권한이 있는 `portfolio_app` 역할로 연결한다.
- Vercel에서는 Supabase Transaction pooler 연결 문자열, 연결 수 1, prepared statement 비활성화와 SSL 필수를 사용한다.
- 최초 패스키 등록과 마지막 패스키 삭제는 계정 행을 `SELECT ... FOR UPDATE`로 잠그는 트랜잭션에서 직렬화한다.
- ceremony는 조건부 `UPDATE ... RETURNING`으로 한 번만 소비한다. 만료되거나 소비된 행은 다시 반환되지 않는다.
- 세션과 ceremony의 원문 식별자는 쿠키·응답에만 잠시 존재하며 DB에는 해시만 저장한다. 만료된 상태는 새 상태 생성 시 하루 유예 후 정리한다.

## Registration flow

1. 서버가 등록용 challenge와 WebAuthn 생성 옵션을 만들고 만료 전까지 보관한다.
2. 브라우저가 `navigator.credentials.create()`를 호출한다.
3. 인증기가 키 쌍을 만들고 attestation 응답을 반환한다. 애플리케이션에는 개인키가 전달되지 않는다.
4. 서버가 challenge, origin, RP ID와 응답 형식을 검증한다.
5. 검증에 성공한 경우에만 공개키와 자격 증명 메타데이터를 저장한다.
6. 취소·검증 실패·만료 시에는 패스키 레코드를 만들지 않고 사용자에게 안전한 오류를 보여 준다.

두 번째 패스키 등록 옵션에는 이미 등록된 credential ID를 제외 목록으로 제공해 중복 등록을 줄인다.

## Authentication flow

1. 서버가 로그인용 challenge를 새로 만들고 만료 전까지 보관한다.
2. 브라우저가 `navigator.credentials.get()`으로 인증기 서명을 요청한다.
3. 서버가 credential ID로 저장된 공개키를 찾는다.
4. 서버가 서명, challenge, origin, RP ID 및 서명 카운터 정책을 검증한다.
5. 성공하면 challenge를 소비하고 인증 세션을 만든다. 실패 시 challenge 처리 정책도 구현 문서에 명시한다.
6. 인증된 계정 ID를 기준으로 비공개 자료를 조회한다.

challenge에는 용도와 만료 시간을 연결한다. 등록용 challenge를 로그인에 쓰거나, 한 번 사용한 challenge를 다시 쓰거나, 다른 계정 절차에 쓰는 요청은 거절한다.

## Authorization boundary

- 비공개 API는 모든 요청에서 유효한 인증 상태를 검사한다.
- 자료 조회·변경 쿼리는 세션에서 얻은 계정 ID로 범위를 제한한다.
- URL, 쿼리 문자열 또는 요청 본문의 계정 ID는 권한 판단의 근거로 사용하지 않는다.
- 교차 계정 자원 요청에는 403 또는 404 중 일관된 정책을 택하고 비인증 요청에는 401 또는 403을 반환한다.
- 로그아웃은 세션을 폐기하고 이후 같은 세션 값으로 보낸 요청을 거절한다.

## Passkey lifecycle and recovery

- 인증된 사용자는 패스키 이름과 등록 날짜가 표시된 목록을 볼 수 있다.
- 패스키 삭제는 현재 인증된 계정이 소유한 credential에만 허용한다.
- 삭제 후 해당 credential의 공개키를 더 이상 로그인 검증에 사용하지 않는다.
- 복구 시험을 위해 서로 독립적으로 사용할 수 있는 패스키 두 개를 등록한다. 동기화형 패스키를 같은 공급자에 저장한 경우 독립적인 복구 수단인지 설명한다.
- 삭제 요청은 현재 인증된 계정의 credential 수를 계정별 트랜잭션 잠금 안에서 다시 확인한다.
- 패스키가 하나만 남으면 삭제하지 않고 `409 Conflict`와 “마지막 패스키는 삭제할 수 없습니다. 새 패스키를 먼저 등록하세요.”라는 안내를 반환한다.
- 두 개 이상이면 요청한 credential만 삭제한다. 삭제 후에도 최소 한 개가 남아야 한다.
- DB를 운영자가 직접 변경해 credential이 0개가 되면 비밀번호 복구 수단이 없으므로 해당 계정은 로그인할 수 없는 상태가 된다.

## Evidence and privacy design

- 등록·로그인 요청별 challenge는 전체 값 대신 비교 가능한 축약값이나 해시로 표시한다.
- 저장소 예시는 공개키와 공개 메타데이터만 보여 주며 운영 연결 문자열을 포함하지 않는다.
- HTTP 증거의 쿠키, Authorization 헤더, 세션 및 토큰 값은 `[REDACTED]`로 바꾼다.
- 개인키가 요청 본문에 없다는 사실은 WebAuthn 응답 필드 목록과 프로토콜 설명으로 입증한다.
- 실제 이메일, GitHub 계정, 이름, 기관명과 내부 프로젝트 정보를 가상 값으로 교체한다.
- 원본 요청·응답을 임시로 보관해야 할 때는 Git에서 제외된 `evidence/raw/`에만 두고, 제출용 정제본에는 credential ID와 공개키 원문도 노출하지 않는다.

## Operational design

- 운영 도메인의 HTTPS origin과 RP ID를 환경 설정으로 관리하고 실제 패스키 등록 전에 최종 도메인을 확정한다.
- 비밀값은 버전 관리에 넣지 않고 `.env.example`에는 변수 이름만 둔다.
- challenge 만료·소비, 인증 실패, 패스키 등록·삭제 이벤트를 비밀값 없이 기록한다.
- Vercel 함수는 Supabase Transaction pooler를 통해 공유 상태를 사용한다. 함수 재시작 후에도 미사용 challenge와 유효 세션은 만료 시각까지 유지된다.
- 배포 전 `checklists/release.md`와 `scripts/pre-deploy.ps1`을 수행한다.

## Decisions still required

- 최종 Production 도메인과 RP ID
- Vercel에 소스를 전달할 Git 공급자(GitHub 권장, GitLab, Bitbucket) 또는 CLI 수동 배포 방식
- Preview 인증 환경이 필요한 경우 고정 Preview 도메인과 별도 Supabase 프로젝트 사용 여부
