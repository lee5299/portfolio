# Project Working Rules

- Read `PROJECT.md`, `docs/PRD.md`, and `docs/CURRENT_STATE.md` before substantial work.
- Keep `PROJECT.md`, design decisions, and current state aligned with material changes.
- Do not commit secrets, `.env` files, production data, or access tokens. Use `.env.example` for variable names only.
- Run the configured tests and `scripts/validate-project.ps1` before declaring work complete.
- Before deployment, complete `checklists/release.md` and run `scripts/pre-deploy.ps1`.
- State assumptions, risks, and unverified claims plainly. Recommend better alternatives when evidence supports them.
- For browser-based configuration (for example cloud consoles, Git hosting, deployment dashboards, domains, OAuth, or API consoles), guide the user instead of completing the settings on their behalf. Explain the navigation, option trade-offs, safe values, verification steps, and recovery path so the user can learn and retain control.
- Do not ask the user to paste credentials, tokens, recovery codes, or other secrets into the chat. Explain where to enter them in the relevant service instead.
