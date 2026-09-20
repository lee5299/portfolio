import { randomBytes, timingSafeEqual } from 'node:crypto';

function token(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export class EphemeralState {
  #ceremonies = new Map();
  #sessions = new Map();
  #bootstrapCodes = new Map();

  constructor({ ceremonyTtlMs, sessionTtlMs }) {
    this.ceremonyTtlMs = ceremonyTtlMs;
    this.sessionTtlMs = sessionTtlMs;
  }

  issueBootstrapCode(accountId) {
    const code = token(18);
    this.#bootstrapCodes.set(accountId, code);
    return code;
  }

  verifyBootstrapCode(accountId, candidate) {
    const expected = this.#bootstrapCodes.get(accountId);
    if (!expected || !candidate || expected.length !== candidate.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
  }

  consumeBootstrapCode(accountId) {
    this.#bootstrapCodes.delete(accountId);
  }

  createCeremony(value) {
    this.cleanup();
    const id = token();
    this.#ceremonies.set(id, { ...value, expiresAt: Date.now() + this.ceremonyTtlMs });
    return id;
  }

  consumeCeremony(id, expectedType) {
    this.cleanup();
    const ceremony = this.#ceremonies.get(id);
    this.#ceremonies.delete(id);
    if (!ceremony || ceremony.type !== expectedType || ceremony.expiresAt <= Date.now()) return null;
    return ceremony;
  }

  createSession(accountId) {
    this.cleanup();
    const id = token();
    this.#sessions.set(id, { accountId, expiresAt: Date.now() + this.sessionTtlMs });
    return id;
  }

  getSession(id) {
    this.cleanup();
    if (!id) return null;
    return this.#sessions.get(id) ?? null;
  }

  deleteSession(id) {
    if (id) this.#sessions.delete(id);
  }

  cleanup() {
    const now = Date.now();
    for (const [id, value] of this.#ceremonies) {
      if (value.expiresAt <= now) this.#ceremonies.delete(id);
    }
    for (const [id, value] of this.#sessions) {
      if (value.expiresAt <= now) this.#sessions.delete(id);
    }
  }
}
