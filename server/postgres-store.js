function mapPasskey(row) {
  return {
    id: row.credential_id,
    publicKey: row.public_key,
    counter: Number(row.counter),
    transports: row.transports ?? [],
    deviceType: row.device_type,
    backedUp: row.backed_up,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString(),
  };
}

function mapPrivateItem(row) {
  return { id: row.id, title: row.title, body: row.body };
}

export class PostgresStore {
  constructor(sql) {
    this.sql = sql;
  }

  async init() {
    try {
      await this.sql`select 1 from portfolio_accounts limit 1`;
    } catch (error) {
      throw new Error('Supabase 스키마가 없습니다. supabase/migrations/20260920000000_initial.sql을 먼저 적용하세요.', { cause: error });
    }
  }

  async #hydrateAccount(row) {
    if (!row) return null;
    const [passkeys, privateItems] = await Promise.all([
      this.sql`select * from portfolio_passkeys where account_id = ${row.id} order by created_at`,
      this.sql`select * from portfolio_private_items where account_id = ${row.id} order by created_at`,
    ]);
    return {
      id: row.id,
      alias: row.alias,
      displayName: row.display_name,
      webAuthnUserId: row.webauthn_user_id,
      passkeys: passkeys.map(mapPasskey),
      privateItems: privateItems.map(mapPrivateItem),
    };
  }

  async getAccountById(accountId) {
    const [row] = await this.sql`select * from portfolio_accounts where id = ${accountId}`;
    return this.#hydrateAccount(row);
  }

  async getAccountByAlias(alias) {
    const [row] = await this.sql`select * from portfolio_accounts where alias = ${alias}`;
    return this.#hydrateAccount(row);
  }

  async getAccountByCredentialId(credentialId) {
    if (typeof credentialId !== 'string' || !credentialId) return null;
    const [row] = await this.sql`
      select p.*, a.alias, a.display_name, a.webauthn_user_id
      from portfolio_passkeys p
      join portfolio_accounts a on a.id = p.account_id
      where p.credential_id = ${credentialId}
    `;
    if (!row) return null;
    const account = await this.getAccountById(row.account_id);
    return { account, passkey: mapPasskey(row) };
  }

  async addPasskey(accountId, passkey, { requireEmpty = false } = {}) {
    try {
      return await this.sql.begin(async (transaction) => {
        const account = await transaction`select id from portfolio_accounts where id = ${accountId} for update`;
        if (!account.length) return 'account-not-found';
        if (requireEmpty) {
          const existing = await transaction`select 1 from portfolio_passkeys where account_id = ${accountId} limit 1`;
          if (existing.length) return 'bootstrap-used';
        }
        await transaction`
          insert into portfolio_passkeys
            (credential_id, account_id, public_key, counter, transports, device_type, backed_up, name, created_at)
          values
            (${passkey.id}, ${accountId}, ${passkey.publicKey}, ${passkey.counter},
             ${transaction.json(passkey.transports ?? [])}, ${passkey.deviceType}, ${passkey.backedUp},
             ${passkey.name}, ${passkey.createdAt})
        `;
        return 'created';
      });
    } catch (error) {
      if (error.code === '23505') return 'duplicate';
      throw error;
    }
  }

  async updatePasskeyUsage(accountId, credentialId, counter, lastUsedAt, expectedCounter) {
    const rows = await this.sql`
      update portfolio_passkeys
      set counter = ${counter}, last_used_at = ${lastUsedAt}
      where account_id = ${accountId} and credential_id = ${credentialId} and counter = ${expectedCounter}
      returning credential_id
    `;
    return rows.length > 0;
  }

  async deletePasskey(accountId, credentialId) {
    return this.sql.begin(async (transaction) => {
      const account = await transaction`select id from portfolio_accounts where id = ${accountId} for update`;
      if (!account.length) return 'account-not-found';
      const existing = await transaction`
        select credential_id from portfolio_passkeys
        where account_id = ${accountId} and credential_id = ${credentialId}
      `;
      if (!existing.length) {
        return 'not-found';
      }
      const [{ count }] = await transaction`
        select count(*)::int as count from portfolio_passkeys where account_id = ${accountId}
      `;
      if (count <= 1) return 'last-passkey';
      await transaction`
        delete from portfolio_passkeys where account_id = ${accountId} and credential_id = ${credentialId}
      `;
      return 'deleted';
    });
  }
}
