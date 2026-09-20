-- Destructive cleanup for moving the portfolio to a separate Supabase project.
-- Run only after exporting any portfolio data that must be retained and switching Vercel away from this database.
begin;

revoke connect on database postgres from portfolio_passkey_app;
drop schema if exists portfolio_passkey cascade;
drop role if exists portfolio_passkey_app;

commit;
