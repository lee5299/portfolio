-- One-row verification for the isolated portfolio schema and role.
-- Expected result: every column is true.
with expected_tables(table_name) as (
  values ('accounts'), ('ceremonies'), ('passkeys'), ('private_items'), ('sessions')
),
actual_tables as (
  select tablename as table_name, rowsecurity
  from pg_tables
  where schemaname = 'portfolio_passkey'
),
table_status as (
  select
    count(*) = 5
      and bool_and(rowsecurity)
      and not exists (
        select table_name from expected_tables
        except
        select table_name from actual_tables
      ) as tables_and_rls_ok
  from actual_tables
),
expected_privileges(table_name, privilege_type) as (
  values
    ('accounts', 'SELECT'),
    ('private_items', 'SELECT'),
    ('passkeys', 'SELECT'), ('passkeys', 'INSERT'), ('passkeys', 'UPDATE'), ('passkeys', 'DELETE'),
    ('ceremonies', 'SELECT'), ('ceremonies', 'INSERT'), ('ceremonies', 'UPDATE'), ('ceremonies', 'DELETE'),
    ('sessions', 'SELECT'), ('sessions', 'INSERT'), ('sessions', 'UPDATE'), ('sessions', 'DELETE')
),
actual_app_privileges as (
  select table_name, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'portfolio_passkey'
    and grantee = 'portfolio_passkey_app'
),
privilege_status as (
  select
    not exists (
      select * from expected_privileges
      except
      select * from actual_app_privileges
    )
    and not exists (
      select * from actual_app_privileges
      except
      select * from expected_privileges
    ) as app_privileges_ok
),
forbidden_table_status as (
  select count(*) = 0 as forbidden_table_roles_absent
  from information_schema.role_table_grants
  where table_schema = 'portfolio_passkey'
    and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
),
forbidden_schema_status as (
  select bool_and(not has_schema_privilege(role_name, 'portfolio_passkey', 'USAGE')) as forbidden_schema_roles_absent
  from unnest(array['anon', 'authenticated', 'service_role']) as roles(role_name)
),
role_status as (
  select
    count(*) = 1
      and bool_and(not rolcanlogin and rolbypassrls)
      and has_schema_privilege('portfolio_passkey_app', 'portfolio_passkey', 'USAGE') as app_role_ok
  from pg_roles
  where rolname = 'portfolio_passkey_app'
)
select
  tables_and_rls_ok,
  app_privileges_ok,
  forbidden_table_roles_absent,
  forbidden_schema_roles_absent,
  app_role_ok,
  tables_and_rls_ok
    and app_privileges_ok
    and forbidden_table_roles_absent
    and forbidden_schema_roles_absent
    and app_role_ok as overall_ok
from table_status
cross join privilege_status
cross join forbidden_table_status
cross join forbidden_schema_status
cross join role_status;
