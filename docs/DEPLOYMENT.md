# Vercel + Supabase deployment

## 확정 구조

- 공개 파일과 Express API: Vercel
- 운영 데이터: Supabase PostgreSQL
- 연결 방식: Supabase Shared pooler의 **Transaction mode**
- WebAuthn 상태: 고정된 `APP_ORIGIN`과 `RP_ID`
- 브라우저의 Supabase 직접 접근: 사용하지 않음

Supabase는 서버리스 함수에 Transaction pooler를 권장한다. 애플리케이션은 `postgres` 클라이언트를 모듈 범위에서 한 번 만들고 `max: 1`, `prepare: false`, `ssl: 'require'`로 사용한다. [Supabase 연결 문서](https://supabase.com/docs/guides/database/connecting-to-postgres)

## 지금 알아야 할 이후 선택 사항

### 1. 운영 도메인 — 실제 패스키 등록 전에 결정

1. **소유한 사용자 정의 도메인 — 장기 운영 추천:** 예: `portfolio.example.com`. 주소를 유지할 계획이라면 가장 안정적이다.
2. **고정 Vercel Production 도메인 — 빠른 제출 추천:** 예: `project-name.vercel.app`. 별도 도메인 구매 없이 시작할 수 있다.
3. **기존 사이트의 하위 도메인:** 기존 도메인 DNS를 관리할 수 있을 때 사용한다.

패스키는 RP ID에 묶인다. `project-name.vercel.app`에서 등록한 패스키는 나중에 `portfolio.example.com`으로 자동 이전되지 않는다. 도메인을 바꾸려면 이전 도메인에 접근할 수 있을 때 새 도메인에서 패스키를 다시 등록해야 한다.

현재 확정한 Production origin은 `https://portfoliovercel-beta-three.vercel.app`이고 RP ID는 `portfoliovercel-beta-three.vercel.app`이다. 실제 패스키를 등록한 뒤에는 이 주소를 유지한다.

### 2. Vercel 소스 연결 방식 — 확정

- GitHub 저장소: `https://github.com/lee5299/portfolio`
- 기본 브랜치: `main`
- 준비 브랜치: `feat/passkey-private-area`

Supabase 환경변수와 migration을 준비하기 전에는 기능 브랜치를 `main`으로 병합하지 않는다. 실제 비밀값과 패스키 데이터는 GitHub에 커밋하지 않는다.

### 3. Preview 인증 환경

1. **Preview에서는 화면과 비인증 API만 확인 — 추천:** 실제 패스키는 Production에서만 등록한다.
2. 고정 Preview 도메인과 별도 Supabase 프로젝트 사용
3. 모든 임시 Preview URL에서 인증 허용: RP ID와 origin이 계속 달라지고 공격 표면이 커져 사용하지 않는다.

## 1단계: Supabase 프로젝트 준비

사용자가 Supabase 대시보드에서 직접 수행한다.

1. 새 프로젝트를 만들고 Vercel 실행 지역과 가까운 지역을 고른다.
2. 데이터베이스 비밀번호는 비밀번호 관리자에 저장한다. 채팅, 소스 파일 또는 문서에 붙여 넣지 않는다.
3. **SQL Editor**에서 [`supabase/migrations/20260920000000_initial.sql`](../supabase/migrations/20260920000000_initial.sql)을 열어 전체 내용을 실행한다.
4. **Table Editor**에서 다음 다섯 테이블이 생겼는지 확인한다: `portfolio_accounts`, `portfolio_private_items`, `portfolio_passkeys`, `portfolio_ceremonies`, `portfolio_sessions`.
5. 각 테이블의 RLS가 활성화됐는지 확인한다. 브라우저용 `anon`/`authenticated` 정책은 만들지 않는다.
6. 비밀번호 관리자에서 이 서비스 전용 DB 비밀번호를 새로 만든다. SQL Editor의 새 임시 쿼리에서 아래 명령의 자리표시자만 바꾸어 한 번 실행한 뒤 쿼리 내용을 지운다. 이 값은 프로젝트 DB 관리자 비밀번호와 달라야 한다.

   ```sql
   alter role portfolio_app with login password '서비스 전용 비밀번호';
   ```

7. 프로젝트 상단 **Connect**에서 **Transaction pooler** URI를 확인한다. 사용자 이름을 `portfolio_app.[PROJECT-REF]`로 바꾸고 비밀번호 자리에 서비스 전용 비밀번호를 넣는다. 비밀번호의 예약 문자는 URL 인코딩해야 한다. Supabase는 외부 서비스마다 별도 DB 사용자를 만들 것을 권장한다. [Supabase 역할 문서](https://supabase.com/docs/guides/database/postgres/roles)

복구: migration 실행이 중간에 실패하면 트랜잭션이 전체 변경을 되돌린다. 오류 내용을 확인해 migration을 수정한 뒤 다시 실행한다. 운영 데이터가 생긴 뒤에는 테이블을 삭제하지 말고 새 순방향 migration으로 고친다.

## 2단계: 최초 등록 코드 두 개 만들기

로컬 터미널에서 다음 명령을 두 번 실행한다.

```powershell
npm run setup-code
```

- 첫 실행의 원문 코드는 `owner-demo`용으로 비밀번호 관리자에 저장하고 해시는 `OWNER_SETUP_CODE_HASH`에 사용한다.
- 두 번째 실행의 원문 코드는 `peer-demo`용으로 저장하고 해시는 `PEER_SETUP_CODE_HASH`에 사용한다.
- 원문 코드와 해시를 Git 파일에 기록하지 않는다.
- 최초 패스키 등록이 끝나면 해당 계정은 이미 패스키를 보유하므로 같은 코드로 등록 옵션을 받을 수 없다.

이 코드는 비밀번호 로그인이 아니라 최초 패스키를 누가 등록할지 제한하는 일회성 등록 승인 값이다. 평상시 로그인에는 사용되지 않는다.

## 3단계: Vercel 프로젝트와 환경변수

Vercel 대시보드의 **Project → Settings → Environment Variables**에서 직접 입력한다. Production과 Preview 값을 무조건 공유하지 않는다. 환경변수를 바꾸면 새 배포부터 적용되므로 반드시 다시 배포한다. [Vercel 환경변수 문서](https://vercel.com/docs/environment-variables)

| 변수 | Production 값 | 비밀 여부 |
|---|---|---|
| `DATABASE_URL` | `portfolio_app`용 Supabase Transaction pooler URI | 비밀 |
| `APP_ORIGIN` | `https://portfoliovercel-beta-three.vercel.app` | 공개 설정 |
| `RP_ID` | `portfoliovercel-beta-three.vercel.app` | 공개 설정 |
| `RP_NAME` | 패스키 창에 표시할 이름 | 공개 설정 |
| `OWNER_SETUP_CODE_HASH` | owner 코드의 SHA-256 해시 | 비밀 취급 |
| `PEER_SETUP_CODE_HASH` | peer 코드의 SHA-256 해시 | 비밀 취급 |

예를 들어 Production URL이 `https://my-portfolio.vercel.app`이면 `APP_ORIGIN=https://my-portfolio.vercel.app`, `RP_ID=my-portfolio.vercel.app`이다. Vercel이 만드는 임시 Preview URL을 이 값으로 자동 신뢰하도록 구현하지 않았다.

Supabase `anon` 키, publishable 키와 service-role 키는 이 애플리케이션에 필요하지 않다. `DATABASE_URL`만 서버 함수에서 사용한다.

필수 변수가 하나라도 빠지면 Vercel 함수는 로컬 JSON 모드로 우회하지 않고 시작에 실패한다. 배포 로그에서 누락된 변수 이름을 확인하고 값을 추가한 뒤 재배포한다.

## 4단계: 배포 전 검사와 배포

```powershell
pwsh ./scripts/pre-deploy.ps1
```

검사가 통과한 뒤 선택한 Git 공급자에서 Vercel로 저장소를 Import하거나 Vercel CLI로 배포한다. Express 앱 진입점은 루트의 `server.js`이며 Vercel에서는 하나의 Function으로 실행된다. [Vercel Express 문서](https://vercel.com/docs/frameworks/backend/express)

첫 배포 후 다음을 순서대로 확인한다.

1. `/api/health`가 `200`과 `{ "ok": true }`를 반환한다.
2. 공개 페이지가 새 시크릿 창에서 로그인 없이 열린다.
3. 비인증 `/api/private-items`가 `401`을 반환한다.
4. `owner-demo` 최초 등록 코드를 이용해 첫 패스키를 등록한다.
5. 로그인한 상태에서 서로 다른 두 번째 패스키를 등록한다.
6. 로그아웃 후 두 패스키가 각각 로그인되는지 확인한다.
7. 하나를 삭제하고 남은 패스키로 로그인한다.
8. 마지막 한 개 삭제 요청이 `409 LAST_PASSKEY_BLOCKED`인지 확인한다.
9. 사용한 challenge와 삭제한 패스키의 재사용이 거절되는지 확인한다.

## 운영과 복구

- 앱 롤백: Vercel Deployments에서 직전 정상 Production 배포를 Rollback한다.
- DB 변경: 기존 migration을 고치지 않고 번호가 증가하는 migration을 추가한다.
- 연결 비밀 노출: SQL Editor에서 `portfolio_app`의 비밀번호를 새 값으로 바꾸고 Vercel `DATABASE_URL`을 갱신한 뒤 재배포한다.
- 등록 코드 노출: 새 코드를 생성해 해당 해시 환경변수를 교체하고 재배포한다. 이미 첫 패스키가 등록된 계정에는 기존·신규 코드 모두 사용할 수 없다.
- 패스키 분실: 등록된 다른 패스키로 로그인한다. 두 패스키를 모두 잃으면 비밀번호 복구가 없으므로 애플리케이션 UI만으로 복구할 수 없다.
- 도메인 변경: 기존 도메인이 살아 있을 때 새 도메인용 배포에서 패스키를 다시 등록한 후 전환한다.

## 배포 시 사용자에게 다시 요청할 항목

- 선택한 최종 Production 도메인
- Supabase와 Vercel 대시보드 작업 완료 여부

연결 문자열, DB 비밀번호, 등록 코드 등 비밀값은 채팅으로 받지 않는다. 사용자가 각 서비스의 환경변수 입력란에 직접 넣고, 나는 화면 경로와 검증 방법을 안내한다.

## Browser-based configuration record

<!-- 설정한 대시보드 위치, 비밀이 아닌 선택, 검증 결과와 복구 경로만 기록한다. 자격 증명·토큰·연결 문자열·등록 코드는 기록하지 않는다. -->
