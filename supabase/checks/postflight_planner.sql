-- Verify only the isolated portfolio schema and role after migration.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'portfolio_passkey'
order by tablename;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'portfolio_passkey'
order by grantee, table_name, privilege_type;

select rolname, rolcanlogin, rolbypassrls
from pg_roles
where rolname = 'portfolio_passkey_app';
