-- Safe preflight for sharing the Planner Supabase project.
-- Expected result before the first migration: zero rows.
select 'schema' as object_type, nspname as object_name
from pg_namespace
where nspname = 'portfolio_passkey'
union all
select 'role' as object_type, rolname as object_name
from pg_roles
where rolname = 'portfolio_passkey_app';
