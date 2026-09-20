import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function token(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export class PostgresState {
  constructor({ sql, ceremonyTtlMs, sessionTtlMs, bootstrapCodeHashes }) {
    this.sql = sql;
    this.ceremonyTtlMs = ceremonyTtlMs;
    this.sessionTtlMs = sessionTtlMs;
    this.bootstrapCodeHashes = bootstrapCodeHashes;
  }

  async verifyBootstrapCode(accountId, candidate) {
    const expected = this.bootstrapCodeHashes[accountId];
    if (!expected || typeof candidate !== 'string') return false;
    const actual = digest(candidate);
    return expected.length === actual.length && timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  }

  async consumeBootstrapCode() {
    // The account's first passkey makes the bootstrap code unusable. The hash remains only in server environment variables.
  }

  async createCeremony(value) {
    const id = token();
    const expiresAt = new Date(Date.now() + this.ceremonyTtlMs);
    await this.sql`
      delete from portfolio_ceremonies
      where expires_at < now() - interval '1 day'
    `;
    await this.sql`
      insert into portfolio_ceremonies
        (id_hash, type, account_id, challenge, passkey_name, bootstrap, expires_at)
      values
        (${digest(id)}, ${value.type}, ${value.accountId ?? null}, ${value.challenge},
         ${value.passkeyName ?? null}, ${Boolean(value.bootstrap)}, ${expiresAt})
    `;
    return id;
  }

  async consumeCeremony(id, expectedType) {
    if (typeof id !== 'string') return null;
    const rows = await this.sql`
      update portfolio_ceremonies
      set consumed_at = now()
      where id_hash = ${digest(id)} and type = ${expectedType}
        and consumed_at is null and expires_at > now()
      returning type, account_id, challenge, passkey_name, bootstrap, expires_at
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      type: row.type,
      accountId: row.account_id,
      challenge: row.challenge,
      passkeyName: row.passkey_name,
      bootstrap: row.bootstrap,
      expiresAt: row.expires_at.getTime(),
    };
  }

  async createSession(accountId) {
    const id = token();
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    await this.sql`
      delete from portfolio_sessions
      where expires_at < now() - interval '1 day'
         or revoked_at < now() - interval '1 day'
    `;
    await this.sql`
      insert into portfolio_sessions (id_hash, account_id, expires_at)
      values (${digest(id)}, ${accountId}, ${expiresAt})
    `;
    return id;
  }

  async getSession(id) {
    if (typeof id !== 'string' || !id) return null;
    const [row] = await this.sql`
      select account_id, expires_at from portfolio_sessions
      where id_hash = ${digest(id)} and revoked_at is null and expires_at > now()
    `;
    return row ? { accountId: row.account_id, expiresAt: row.expires_at.getTime() } : null;
  }

  async deleteSession(id) {
    if (typeof id !== 'string' || !id) return;
    await this.sql`
      update portfolio_sessions set revoked_at = now()
      where id_hash = ${digest(id)} and revoked_at is null
    `;
  }
}
