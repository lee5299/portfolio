# Release checklist

- [ ] Requirements and acceptance criteria are met.
- [ ] `scripts/validate-project.ps1` passes.
- [ ] Tests and build pass through `scripts/pre-deploy.ps1`.
- [ ] `.env` and other secrets are not tracked by Git.
- [ ] Deployment and rollback steps are documented and reviewed.
- [ ] Required environment variables are provisioned in the target environment.
- [ ] Post-deployment verification and monitoring are defined.
- [ ] Final Production domain and RP ID are fixed before registering real passkeys.
- [ ] Planner Supabase에 `portfolio_passkey` 스키마만 추가됐고 다섯 테이블의 RLS가 활성화됐다.
- [ ] Planner의 기존 스키마·테이블·역할과 애플리케이션 동작이 변경되지 않았다.
- [ ] `DATABASE_URL` uses the Transaction pooler and exists only in Vercel environment settings.
- [ ] Owner and peer setup-code plaintext values are stored outside Git; Vercel contains hashes only.
- [ ] Preview deployment does not share Production passkeys unless it has an intentionally fixed origin and isolated database.
