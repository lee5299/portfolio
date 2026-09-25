# Project brief

- **Name:** 패스키로 보호하는 자기소개 페이지
- **Status:** Production verified; public-page redesign in local review
- **Owner:** 개인 프로젝트
- **Repository:** https://github.com/lee5299/portfolio
- **Production URL:** https://portfoliovercel-beta-three.vercel.app

## Goal

기존 자기소개 페이지는 누구나 열어 볼 수 있게 유지하면서, 소유자만 패스키로 접근할 수 있는 비공개 공간을 추가한다. 비밀번호를 만들거나 저장하지 않으며 서버가 WebAuthn 공개키로 인증 결과를 검증한 뒤에만 비공개 자료를 제공한다.

## In scope

- 기존 공개 자기소개 콘텐츠 유지
- 공개 소개에는 사용자가 확정한 About Me와 MBTI·최근 읽은 책·요즘 공부하는 것을 표시한다. 취미와 임의의 성향 예시는 넣지 않는다.
- 공개 영역과 비공개 영역의 시각적·기술적 분리
- 비공개 영역을 기본 접힘 상태로 두고 명시적인 열기 동작 후 패스키 인증 UI를 표시
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
- **Deployment target:** `portfoliovercel-beta-three.vercel.app` on Vercel Functions + Planner의 Supabase PostgreSQL을 임시 공유
- **Rollback approach:** Vercel의 직전 정상 배포로 되돌린다. 데이터베이스 변경은 앞으로 추가할 순방향 보정 migration으로 복구하며 운영 데이터가 있는 테이블을 임의로 삭제하지 않는다.
- **Test command:** See `config/automation.json`.

## Lifecycle

1. 현재 과제에서는 Vercel 소개 페이지가 Planner Supabase의 격리 스키마를 임시 사용한다.
2. 새 자기소개 페이지의 기능과 디자인을 완성한다.
3. 완성본을 Planner의 최종 origin에 통합하고 그 origin/RP ID에서 패스키를 새로 등록한다.
4. 전환 검증 뒤 과제용 패스키·세션·challenge를 정리한다.

## Visual direction in progress

- 첫 화면은 '문제를 살피고, 필요한 것을 만듭니다.'로 시작하며 학사정보시스템 개발·유지보수와 업무 매뉴얼 정리 경험, 현재 배우는 분야를 짧게 소개한다.
- 파스텔 민트 중심의 큰 제목과 넓은 여백, 절제된 스크롤 전환을 적용한다.
- ‘경험과 배움’은 기존 업무와 교육과정에서 배우는 분야를 짧게 정리하고, ‘프로젝트’는 큰 개념도와 문제·접근·결과 설명을 짝지어 보여 준다.
- 실제 프로젝트 화면을 받기 전에는 가상 사례 개념도로 표시한다. 패스키 서버와 비공개 API는 변경하지 않는다.
- 성향·취미·독서는 공개 섹션의 짧은 정적 문구로 두고 현재 예시임을 분명히 표시한다. 밝은 분홍·파랑 성격 척도는 측정값처럼 보일 수 있어 사용하지 않는다.
