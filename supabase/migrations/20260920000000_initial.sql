begin;

create table if not exists public.portfolio_accounts (
  id text primary key,
  alias text not null unique,
  display_name text not null,
  webauthn_user_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_private_items (
  id text primary key,
  account_id text not null references public.portfolio_accounts(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_passkeys (
  credential_id text primary key,
  account_id text not null references public.portfolio_accounts(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0 check (counter >= 0),
  transports jsonb not null default '[]'::jsonb,
  device_type text not null,
  backed_up boolean not null,
  name text not null check (char_length(name) between 2 and 40),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists portfolio_passkeys_account_id_idx on public.portfolio_passkeys(account_id);

create table if not exists public.portfolio_ceremonies (
  id_hash text primary key,
  type text not null check (type in ('registration', 'authentication')),
  account_id text references public.portfolio_accounts(id) on delete cascade,
  challenge text not null,
  passkey_name text,
  bootstrap boolean not null default false,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_ceremonies_expiry_idx on public.portfolio_ceremonies(expires_at);

create table if not exists public.portfolio_sessions (
  id_hash text primary key,
  account_id text not null references public.portfolio_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists portfolio_sessions_expiry_idx on public.portfolio_sessions(expires_at);

alter table public.portfolio_accounts enable row level security;
alter table public.portfolio_private_items enable row level security;
alter table public.portfolio_passkeys enable row level security;
alter table public.portfolio_ceremonies enable row level security;
alter table public.portfolio_sessions enable row level security;

revoke all on public.portfolio_accounts from anon, authenticated, service_role;
revoke all on public.portfolio_private_items from anon, authenticated, service_role;
revoke all on public.portfolio_passkeys from anon, authenticated, service_role;
revoke all on public.portfolio_ceremonies from anon, authenticated, service_role;
revoke all on public.portfolio_sessions from anon, authenticated, service_role;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'portfolio_app') then
    create role portfolio_app nologin noinherit bypassrls;
  end if;
end
$$;

alter role portfolio_app nologin noinherit bypassrls;
grant connect on database postgres to portfolio_app;
grant usage on schema public to portfolio_app;
grant select on public.portfolio_accounts, public.portfolio_private_items to portfolio_app;
grant select, insert, update, delete on public.portfolio_passkeys to portfolio_app;
grant select, insert, update, delete on public.portfolio_ceremonies to portfolio_app;
grant select, insert, update, delete on public.portfolio_sessions to portfolio_app;

insert into public.portfolio_accounts (id, alias, display_name, webauthn_user_id) values
  ('account-owner-demo', 'owner-demo', '가상 소유자', 'b3duZXItZGVtby13ZWJhdXRobi11c2VyLWlk'),
  ('account-peer-demo', 'peer-demo', '가상 비교 사용자', 'cGVlci1kZW1vLXdlYmF1dGhuLXVzZXItaWQ')
on conflict (id) do nothing;

insert into public.portfolio_private_items (id, account_id, title, body) values
  ('owner-note-1', 'account-owner-demo', '준비 중인 프로젝트', '가상 프로젝트의 다음 작업을 정리한 예시 메모입니다.'),
  ('owner-note-2', 'account-owner-demo', '지원 목록', '실제 회사 정보가 아닌 제출용 가상 지원 목록입니다.'),
  ('owner-note-3', 'account-owner-demo', '이번 주 회고', '실제 개인정보를 포함하지 않는 가상 회고입니다.'),
  ('peer-note-1', 'account-peer-demo', '비교 계정 메모 1', '교차 계정 접근 거절 시험용 가상 자료입니다.'),
  ('peer-note-2', 'account-peer-demo', '비교 계정 메모 2', '권한 분리 시험 전후 건수를 확인하기 위한 항목입니다.'),
  ('peer-note-3', 'account-peer-demo', '비교 계정 메모 3', '제출물에는 가상 데이터만 사용합니다.')
on conflict (id) do nothing;

commit;
