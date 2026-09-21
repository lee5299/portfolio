-- Submission-safe production evidence. This query never returns credential IDs,
-- public-key values, ceremony IDs, session hashes, setup codes, or tokens.
with passkey_summary as (
  select
    account_id,
    count(*)::int as passkey_count,
    bool_and(public_key is not null and char_length(public_key) > 0) as public_keys_present,
    bool_and(counter >= 0) as counters_valid
  from portfolio_passkey.passkeys
  group by account_id
),
private_item_summary as (
  select account_id, count(*)::int as private_item_count
  from portfolio_passkey.private_items
  group by account_id
),
column_safety as (
  select
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'portfolio_passkey' and column_name = 'private_key'
    ) as private_key_column_absent,
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'portfolio_passkey' and column_name like '%password%'
    ) as password_column_absent
)
select
  p.account_id,
  p.passkey_count,
  p.public_keys_present,
  p.counters_valid,
  i.private_item_count,
  c.private_key_column_absent,
  c.password_column_absent
from passkey_summary p
join private_item_summary i using (account_id)
cross join column_safety c
order by p.account_id;
