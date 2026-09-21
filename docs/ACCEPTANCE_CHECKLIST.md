# Passkey private space acceptance checklist

실제 개인정보, 쿠키, 세션, 토큰, 개인키 및 운영 비밀값은 증거에 포함하지 않는다. 아래 항목은 2026-09-21 Production과 자동 시험에서 확인했다.

## 0. 제출 주소와 공개 접근

- [x] **T08-C01** 결과물 HTTPS URL이 있다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C02** 공개 소스 HTTPS URL이 있다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C03** 결과물과 소스가 별도 로그인 없이 열린다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C10** 결과물 첫 화면은 인증 없이 열리는 공개 소개 페이지다. (증거: `docs/TEST_EVIDENCE.md` Browser verification)
- [x] **T08-C11** 기존 공개 소개 내용이 유지된다. (증거: `public/index.html`, Production 화면 확인)
- [x] **T08-C12** 프로필과 비공개 자료가 모두 가상 데이터임을 명시한다. (증거: `public/index.html`, `docs/TEST_EVIDENCE.md`)

## 1. 공개 영역과 비공개 영역

- [x] **T08-C13** 공개 소개와 `PASSKEY PROTECTED` 영역이 화면에서 구분된다. (증거: `docs/TEST_EVIDENCE.md` Browser verification)
- [x] **T08-C14** 각 가상 계정의 비공개 항목이 세 개다. (증거: `supabase/checks/evidence_summary.sql` 실행 결과)
- [x] **T08-C15** 비인증 상태에는 비공개 내용이 표시되지 않는다. (증거: `docs/TEST_EVIDENCE.md`)
- [x] **T08-C16** 비인증 비공개 API 요청이 거절된다. (증거: `docs/TEST_EVIDENCE.md`의 `AUTH_REQUIRED`)
- [x] **T08-C17** 거절 상태가 `401`이다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C18** 공개 HTML과 번들에 비공개 고유 문구가 없다. (증거: `docs/TEST_EVIDENCE.md`, `test/app.test.js`)

## 2. 패스키 등록

- [x] **T08-C19** 등록 challenge를 서버 측 ceremony 저장소에 보관하고 원자적으로 소비한다. (증거: `server/postgres-state.js`, `docs/IMPLEMENTATION.md`)
- [x] **T08-C20** 연속 등록 challenge가 서로 다르다. (증거: `test/app.test.js`)
- [x] **T08-C21** 등록 뒤 서버에 공개키가 저장된다. (증거: `supabase/checks/evidence_summary.sql`의 `public_keys_present`)
- [x] **T08-C22** 저장 값이 비밀번호가 아닌 공개키임을 설명한다. (증거: `docs/IMPLEMENTATION.md`, `docs/TEST_EVIDENCE.md`)
- [x] **T08-C23** 등록 요청에 개인키가 없고 DB에도 개인키 컬럼이 없다. (증거: `supabase/checks/evidence_summary.sql`, WebAuthn 등록 경로)
- [x] **T08-C24** 패스키 이름과 등록 날짜를 저장하고 목록에 표시한다. (증거: Production 실제 기기 확인, `client/app.js`)
- [x] **T08-C25** 등록 취소 안내가 표시되고 credential 수가 늘지 않는다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C26** 주 패스키는 동기화형 관리자, 백업은 별도 인증 위치에 등록했다. (증거: 실제 기기 검증 기록; 계정·기기 식별 정보는 미보관)

## 3. 패스키 로그인, 세션과 재사용 방지

- [x] **T08-C27** 로그인 요청마다 새 challenge를 발급한다. (증거: `server/app.js`, `docs/TEST_EVIDENCE.md`)
- [x] **T08-C28** 두 로그인 challenge의 정제된 해시가 서로 다르다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C29** 저장 공개키의 서명 검증 성공 뒤에만 세션을 만든다. (증거: `server/app.js`, `server/postgres-store.js`)
- [x] **T08-C30** 실제 패스키 성공과 미등록·삭제 패스키 실패를 확인했다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C31** 소비한 ceremony 재사용이 `400 CEREMONY_REJECTED`로 거절된다. (증거: `docs/TEST_EVIDENCE.md`, `test/app.test.js`)
- [x] **T08-C32** 로그인 상태는 해시된 불투명 서버 세션과 `HttpOnly` 쿠키로 식별한다. (증거: `docs/IMPLEMENTATION.md`)
- [x] **T08-C33** 로그아웃 뒤 같은 인증 값의 요청이 `401 AUTH_REQUIRED`다. (증거: `docs/TEST_EVIDENCE.md`, `test/app.test.js`)
- [x] **T08-C34** 증거의 쿠키와 식별자는 마스킹했고 원문 assertion은 보관하지 않았다. (증거: `docs/TEST_EVIDENCE.md`)
- [x] **T08-C35** 페이지에 비밀번호 입력란이 없다. (증거: `public/index.html`, 브라우저 확인)

## 4. 계정 간 격리

- [x] **T08-C36** owner와 peer 가상 계정에 패스키와 서로 다른 비공개 자료가 있다. (증거: `supabase/checks/evidence_summary.sql` 실행 결과)
- [x] **T08-C37** owner→peer 요청이 `403 ACCOUNT_SCOPE_REJECTED`다. (증거: `docs/TEST_EVIDENCE.md`)
- [x] **T08-C38** peer→owner 요청도 `403 ACCOUNT_SCOPE_REJECTED`다. (증거: `docs/TEST_EVIDENCE.md`)
- [x] **T08-C39** 교차 요청 뒤에도 양쪽 자료가 각각 세 건이다. (증거: `supabase/checks/evidence_summary.sql` 실행 결과)
- [x] **T08-C40** 다른 계정 ID를 URL에 보내도 요청이 거절된다. (증거: `docs/TEST_EVIDENCE.md`, `test/app.test.js`)
- [x] **T08-C41** 권한 검사 소스 위치가 설명서에 있다. (증거: `docs/IMPLEMENTATION.md` 3·4절)

## 5. 패스키 두 개와 분실 대비

- [x] **T08-C42** owner 계정에 패스키 두 개가 등록되어 있다. (증거: DB 요약의 owner `passkey_count = 2`)
- [x] **T08-C43** 목록에 패스키 이름과 등록 날짜가 표시된다. (증거: Production 실제 기기 확인)
- [x] **T08-C44** 하나를 삭제한 뒤 남은 백업 패스키로 로그인했다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C45** 삭제한 패스키의 로그인은 실패했다. (증거: `docs/TEST_EVIDENCE.md` Production verification)
- [x] **T08-C46** 마지막 삭제는 `409 LAST_PASSKEY_BLOCKED`이고 패스키 수가 0이 되지 않는다. 모든 키 분실 시 UI 복구가 불가능함도 설명한다. (증거: `docs/TEST_EVIDENCE.md`, `docs/IMPLEMENTATION.md` 6절)

## 6. 인증 구현 설명서와 제출 자료

- [x] **T08-C47** 설명서가 구현, 이유, 위치, 차단 검증, AI와 나, 남은 위험의 여섯 절로 구성된다. (증거: `docs/IMPLEMENTATION.md`)
- [x] **T08-C48** Express 5와 SimpleWebAuthn 14, Supabase PostgreSQL 사용을 명시한다. (증거: `docs/IMPLEMENTATION.md` 1절)
- [x] **T08-C49** 등록·로그인·로그아웃·비공개 조회 소스 위치가 있다. (증거: `docs/IMPLEMENTATION.md` 3절)
- [x] **T08-C50** 비인증·교차 계정·재사용·삭제 시험의 성공과 거절 결과가 있다. (증거: `docs/TEST_EVIDENCE.md`)
- [x] **T08-C51** 키 전체 분실, RP 변경, DB 장애와 공유 인스턴스 위험을 적었다. (증거: `docs/IMPLEMENTATION.md` 6절)
- [x] **T08-C52** 세 단계 이내 조작과 성공·실패 표시가 있다. (증거: `docs/VERIFICATION_GUIDE.md`)
- [x] **T08-C53** AI 작업, 사용자 판단, 채택하지 않은 제안과 이유가 있다. (증거: `docs/IMPLEMENTATION.md` 5절)

## 7. 최종 개인정보·비밀값 검사

- [x] 페이지·증거·가상 데이터에 실제 이름, 이메일, 전화번호, 기관명과 내부 프로젝트 정보가 없다. 제출에 필요한 공개 GitHub 소스 URL만 예외다.
- [x] `.env`, 런타임 데이터, API 키, 세션 비밀, 토큰과 쿠키 원문이 Git에 없다.
- [x] 개인키가 소스, 저장소, 로그와 제출 증거에 없다.
- [x] `runtime-data/`, `evidence/raw/`와 `*.runtime.json`이 Git에 추적되지 않는다.
- [x] 제출 문서의 credential ID와 공개키는 마스킹하거나 안전한 boolean 요약만 쓴다.
- [x] 모든 프로필과 자료가 가상 데이터임을 명시했다.
- [x] 결과물과 소스 저장소가 인증 없이 열리는 것을 확인했다.
- [x] 자동 시험, `scripts/validate-project.ps1`과 `scripts/pre-deploy.ps1`이 통과했다.

## Completion evidence index

| 증거 묶음 | 포함 내용 | 위치 |
|---|---|---|
| 공개/비공개 경계 | 잠긴 화면, 비인증 `401`, 공개 응답의 비공개 문구 부재 | `docs/TEST_EVIDENCE.md` |
| 등록 | 서로 다른 challenge, 공개키 저장, 취소 뒤 건수 유지 | `test/app.test.js`, `supabase/checks/evidence_summary.sql`, `docs/TEST_EVIDENCE.md` |
| 로그인 | 실제 성공·실패, ceremony 재사용 거절, 로그아웃 뒤 거절 | `docs/TEST_EVIDENCE.md`, `test/app.test.js` |
| 계정 격리 | owner→peer와 peer→owner 거절, 자료 건수 유지 | `docs/TEST_EVIDENCE.md`, `supabase/checks/evidence_summary.sql` |
| 분실 대비 | 패스키 2개, 삭제 키 실패, 백업 키 성공, 마지막 삭제 차단 | `docs/TEST_EVIDENCE.md` |
| 구현 설명서 | 여섯 항목, 짧은 확인 방법, AI 역할 | `docs/IMPLEMENTATION.md`, `docs/VERIFICATION_GUIDE.md` |

## 제출 전 증거 정제

- 최초 실패 때 setup code가 보인 화면은 사용하지 않는다. 해당 코드는 이미 폐기·교체했다.
- setup code, cookie, credential ID, 공개키 원문과 assertion 원문이 보이는 화면은 제외하거나 마스킹한다.
- DB 증거는 `evidence_summary.sql`의 boolean과 건수만 사용한다.
