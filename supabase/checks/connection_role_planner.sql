-- Run after assigning the portfolio_passkey_app password.
-- Expected result: role_connection_ready = true.
select
  rolcanlogin
    and rolbypassrls
    and not rolsuper
    and not rolcreatedb
    and not rolcreaterole
    and not rolreplication
    and has_database_privilege('portfolio_passkey_app', current_database(), 'CONNECT')
    and has_schema_privilege('portfolio_passkey_app', 'portfolio_passkey', 'USAGE')
    as role_connection_ready
from pg_roles
where rolname = 'portfolio_passkey_app';
