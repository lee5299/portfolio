# Test evidence

이 문서의 값과 계정은 모두 시험용이다. 세션 쿠키, 등록 코드, 실제 credential ID와 공개키 원문은 기록하지 않는다.

## Automated verification

실행 명령: `npm test`

검증된 항목:

1. 공개 HTML에 비공개 항목의 고유 문구가 없고 비인증 `/api/private-items`가 `401 AUTH_REQUIRED`를 반환한다.
2. 연속한 등록 요청과 로그인 요청의 challenge가 서로 다르다.
3. 한 번 소비한 로그인 ceremony를 다시 보내면 `400 CEREMONY_REJECTED`를 반환한다.
4. 가상 계정 A→B와 B→A 교차 요청이 모두 `403 ACCOUNT_SCOPE_REJECTED`이며 자료 건수가 변하지 않는다.
5. 두 패스키 중 하나는 삭제되고 마지막 하나의 삭제는 `409 LAST_PASSKEY_BLOCKED`로 거절된다.
6. 로그아웃 뒤 같은 세션 쿠키로 요청하면 `401 AUTH_REQUIRED`를 반환한다.
7. 다른 origin의 변경 요청은 `403 ORIGIN_REJECTED`로 거절된다.
8. 런타임 파일에 `privateKey`, `password` 또는 기존 실제 연락처가 없다.
9. 최초 등록 전용 저장은 첫 패스키가 등록된 뒤 `bootstrap-used`로 거절된다.

예시 응답은 실제 인증 값을 포함하지 않는다.

```http
GET /api/private-items
HTTP/1.1 401 Unauthorized

{"error":"패스키 로그인이 필요합니다.","code":"AUTH_REQUIRED","path":"/private-items"}
```

```http
GET /api/accounts/account-peer-demo/private-items
Cookie: sid=[REDACTED]
HTTP/1.1 403 Forbidden

{"error":"다른 계정의 비공개 자료에는 접근할 수 없습니다.","code":"ACCOUNT_SCOPE_REJECTED","path":"/accounts/account-peer-demo/private-items"}
```

```http
DELETE /api/passkeys/[MASKED_CREDENTIAL_ID]
Cookie: sid=[REDACTED]
HTTP/1.1 409 Conflict

{"error":"마지막 패스키는 삭제할 수 없습니다. 새 패스키를 먼저 등록하세요.","code":"LAST_PASSKEY_BLOCKED","path":"/passkeys/[MASKED]"}
```

## Browser verification

- 공개 소개, 프로젝트와 `PASSKEY PROTECTED` 경계가 한 페이지에서 구분되어 보인다.
- 비인증 상태에는 잠긴 안내와 로그인·최초 등록 버튼만 보인다.
- 최초 등록 폼에는 가상 계정, 패스키 이름과 일회용 등록 코드만 있고 비밀번호 입력란이 없다.
- 390px 모바일 화면에서 가로 넘침 없이 잠긴 영역이 표시된다.

## Production verification — 2026-09-21

- 결과물: `https://portfoliovercel-beta-three.vercel.app/`
- 소스: `https://github.com/lee5299/portfolio`
- 배포 기준 커밋: `562cb3c`
- 공개 페이지와 `/api/health`가 각각 `200`을 반환했다.
- 비인증 `/api/private-items`가 `401 AUTH_REQUIRED`를 반환했다.
- 공개 HTML과 JavaScript 번들에서 두 계정의 비공개 항목 고유 문구가 발견되지 않았다.
- CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`를 확인했다.
- 연속 로그인 challenge의 SHA-256 축약값은 `ff06daa924b1`, `aa2127fb9766`으로 달랐다. challenge 원문은 기록하지 않았다.
- 가상 미등록 credential 요청은 `401 UNKNOWN_PASSKEY`, 같은 ceremony 재사용은 `400 CEREMONY_REJECTED`였다.
- 실제 기기에서 owner 주 패스키와 독립 백업 패스키를 등록했다.
- 백업 패스키 로그인, 주 패스키 삭제, 삭제한 패스키 로그인 거절, 백업 패스키 재로그인과 마지막 패스키 삭제 차단을 순서대로 확인했다.
- 마지막 삭제 차단 뒤 owner 주 패스키를 다시 추가해 owner credential 두 개 상태를 복원했다.
- 별도 peer 패스키를 등록했고 owner→peer, peer→owner 요청이 모두 `403 ACCOUNT_SCOPE_REJECTED`였다.
- 안전한 DB 요약 결과 owner/peer의 passkey 수는 각각 2/1, 비공개 항목 수는 각각 3/3이었다. 모든 공개키 존재·counter 유효·개인키 컬럼 부재·비밀번호 컬럼 부재가 `true`였다.
- owner의 패스키 추가 창을 취소하자 “서버에는 아무것도 저장되지 않았다”는 안내가 표시됐고 passkey 수가 2로 유지됐다.
- 공유 DB 적용 뒤 기존 Planner 화면과 데이터 조회가 정상 작동함을 사용자가 확인했다.
- 최초 실패 화면에 노출된 owner setup code는 폐기하고 새 코드와 해시로 교체했다. 해당 화면은 제출 증거에서 제외한다.

공개키 저장과 계정별 현재 건수는 [`../supabase/checks/evidence_summary.sql`](../supabase/checks/evidence_summary.sql)로 실제 값을 노출하지 않고 확인한다.

## Pending evidence

- [x] 실제 등록과 로그인 성공
- [x] 패스키 두 개 등록, 하나 삭제 후 남은 패스키 성공과 삭제한 패스키 실패
- [x] 마지막 패스키 삭제 차단
- [x] owner↔peer 실제 교차 접근 거절
- [x] 저장된 공개키와 계정별 건수의 안전한 요약 쿼리 결과
- [x] 등록 창 취소 전후 credential 건수 유지
- [x] 동일 ceremony 재전송 `400 CEREMONY_REJECTED` (assertion 원문은 보관하지 않음)
- [x] Supabase Transaction pooler를 통한 배포 환경 통합 시험
