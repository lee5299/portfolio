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

## Pending real-device evidence

- [ ] 실제 등록 성공과 저장된 공개키의 마스킹 예시
- [ ] 실제 로그인 성공과 변조·다른 패스키 실패
- [ ] 사용한 assertion 재전송 거절
- [ ] 패스키 두 개 등록 화면
- [ ] 한 개 삭제 후 남은 패스키 성공과 삭제한 패스키 실패
- [ ] Supabase Transaction pooler를 통한 배포 환경 통합 시험
