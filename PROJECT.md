# Project brief

- **Name:** 패스키로 보호하는 자기소개 페이지
- **Status:** Vercel + Supabase implementation complete; service provisioning and real-device verification pending
- **Owner:** 개인 프로젝트
- **Repository:** 미정

## Goal

기존 자기소개 페이지는 누구나 열어 볼 수 있게 유지하면서, 소유자만 패스키로 접근할 수 있는 비공개 공간을 추가한다. 비밀번호를 만들거나 저장하지 않으며 서버가 WebAuthn 공개키로 인증 결과를 검증한 뒤에만 비공개 자료를 제공한다.

## In scope

- 기존 공개 자기소개 콘텐츠 유지
- 공개 영역과 비공개 영역의 시각적·기술적 분리
- 패스키 등록, 로그인, 로그아웃 및 패스키 목록·삭제
- 계정별 비공개 자료의 서버 측 접근 통제
- 계정당 복구용 패스키 2개 등록과 삭제 후 접근 시험
- challenge 일회성·재사용 방지 검증
- 익명 시험 데이터와 정제된 요청·응답 증거 작성

## Out of scope

- 비밀번호 로그인과 비밀번호 복구
- 실제 개인정보 또는 운영 비밀값을 사용한 시연
- 클라이언트 코드에 비공개 자료를 포함한 뒤 화면에서만 숨기는 방식
- 패스키가 모두 사라진 계정을 위한 별도 신원 복구 기능(동작과 한계만 명시)

## Success criteria

- `docs/ACCEPTANCE_CHECKLIST.md`에 정리된 모든 T08 기준을 충족한다.
- 비인증 요청은 비공개 자료를 받지 못하고 401 또는 403 응답을 받는다.
- 등록·로그인 challenge가 요청마다 달라지고 사용 후 재사용되지 않는다.
- 패스키 두 개 중 하나를 삭제해도 남은 패스키로 로그인할 수 있다.
- 두 시험 계정 사이의 교차 접근이 양방향 모두 거절된다.
- 제출물과 증거 자료에 실제 개인정보, 비밀번호, 개인키, 세션 값 또는 토큰 값이 없다.

## Delivery

- **Technology stack:** Node.js 22+, Express 5, SimpleWebAuthn 14, Vanilla JS, Supabase PostgreSQL
- **Deployment target:** Vercel Functions + Supabase Transaction pooler
- **Rollback approach:** Vercel의 직전 정상 배포로 되돌린다. 데이터베이스 변경은 앞으로 추가할 순방향 보정 migration으로 복구하며 운영 데이터가 있는 테이블을 임의로 삭제하지 않는다.
- **Test command:** See `config/automation.json`.
