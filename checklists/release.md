# Release checklist

- [x] 구현 요구사항과 자동화 가능한 acceptance 검사가 충족됐다. 실제 기기 항목은 배포 후 검증 절차에 기록됐다.
- [x] `scripts/validate-project.ps1`가 통과했다. (2026-09-21)
- [x] `scripts/pre-deploy.ps1`를 통해 테스트 12개와 빌드가 통과했다. (2026-09-21)
- [x] `.env`, 런타임 인증 자료와 기타 비밀값이 Git에 추적되지 않는다.
- [x] 배포와 롤백 절차를 `docs/DEPLOYMENT.md`에 기록했다.
- [x] Production 필수 환경변수 6개가 Vercel에 준비됐음을 사용자가 확인했다.
- [x] 배포 후 health, 공개 접근, 비인증 거절과 실제 패스키 검증 순서를 정의했다.
- [x] Production origin을 `https://portfoliovercel-beta-three.vercel.app`, RP ID를 `portfoliovercel-beta-three.vercel.app`으로 확정했다.
- [x] Planner Supabase에는 `portfolio_passkey` 스키마만 추가했고 다섯 테이블의 RLS를 활성화했다. Postflight 여섯 항목이 모두 `true`였다.
- [x] migration이 Planner의 기존 객체를 변경하지 않으며 전용 역할 권한이 지정한 스키마로 제한된 것을 검사했다. 배포 후 기존 Planner 화면과 데이터 조회도 정상임을 확인했다.
- [x] `DATABASE_URL`은 Transaction pooler를 사용하며 Vercel Production 설정에만 저장했다.
- [x] Owner와 peer setup code 원문은 Git 밖에 저장하고 Vercel에는 해시만 등록했다.
- [x] Preview에는 Production 인증 환경변수를 넣지 않아 Production 패스키와 DB 연결을 공유하지 않는다.

## 2026-09-25 공개 페이지 시안 갱신

- [x] 사용자가 피드백을 위해 GitHub `main` 반영을 요청했다.
- [x] 변경 대상은 공개 페이지·클라이언트 동작·설계 문서로 한정했고 인증 서버와 DB 스키마는 변경하지 않았다.
- [x] `scripts/pre-deploy.ps1`에서 프로젝트 검증, 자동 시험 12개, 클라이언트 빌드가 통과했다.
- [x] 업로드할 Git 변경 파일에 `.env`, 실제 패스키 자료, 세션, 원문 등록 코드가 포함되지 않았음을 확인했다.
- [x] 문제가 생기면 Vercel의 이전 정상 Production 배포로 되돌린다.

배포 후에는 공개 첫 화면, 접힌 비공개 영역, 비인증 API 거절, 패스키 로그인과 다시 열기 동작을 확인한다.
