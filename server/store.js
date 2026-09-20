import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

function base64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

export function createInitialData() {
  return {
    version: 1,
    accounts: [
      {
        id: 'account-owner-demo',
        alias: 'owner-demo',
        displayName: '가상 소유자',
        webAuthnUserId: base64url(randomBytes(32)),
        passkeys: [],
        privateItems: [
          { id: 'owner-note-1', title: '준비 중인 프로젝트', body: '가상 프로젝트의 다음 작업을 정리한 예시 메모입니다.' },
          { id: 'owner-note-2', title: '지원 목록', body: '실제 회사 정보가 아닌 제출용 가상 지원 목록입니다.' },
          { id: 'owner-note-3', title: '이번 주 회고', body: '실제 개인정보를 포함하지 않는 가상 회고입니다.' }
        ]
      },
      {
        id: 'account-peer-demo',
        alias: 'peer-demo',
        displayName: '가상 비교 사용자',
        webAuthnUserId: base64url(randomBytes(32)),
        passkeys: [],
        privateItems: [
          { id: 'peer-note-1', title: '비교 계정 메모 1', body: '교차 계정 접근 거절 시험용 가상 자료입니다.' },
          { id: 'peer-note-2', title: '비교 계정 메모 2', body: '권한 분리 시험 전후 건수를 확인하기 위한 항목입니다.' },
          { id: 'peer-note-3', title: '비교 계정 메모 3', body: '제출물에는 가상 데이터만 사용합니다.' }
        ]
      }
    ]
  };
}

function validateData(data) {
  if (data?.version !== 1 || !Array.isArray(data.accounts)) {
    throw new Error('지원하지 않거나 손상된 런타임 데이터 형식입니다.');
  }
  for (const account of data.accounts) {
    if (!account.id || !account.alias || !account.webAuthnUserId) {
      throw new Error('계정 레코드에 필수 필드가 없습니다.');
    }
    if (!Array.isArray(account.passkeys) || !Array.isArray(account.privateItems)) {
      throw new Error('계정의 패스키 또는 비공개 항목 형식이 올바르지 않습니다.');
    }
  }
  return data;
}

export class FileStore {
  #filePath;
  #writeQueue = Promise.resolve();

  constructor(filePath) {
    this.#filePath = filePath;
  }

  async init() {
    await mkdir(path.dirname(this.#filePath), { recursive: true });
    try {
      await this.read();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.#write(createInitialData());
    }
  }

  async read() {
    const raw = await readFile(this.#filePath, 'utf8');
    return validateData(JSON.parse(raw));
  }

  async getAccountById(accountId) {
    const data = await this.read();
    return data.accounts.find((item) => item.id === accountId) ?? null;
  }

  async getAccountByAlias(alias) {
    const data = await this.read();
    return data.accounts.find((item) => item.alias === alias) ?? null;
  }

  async getAccountByCredentialId(credentialId) {
    if (typeof credentialId !== 'string' || !credentialId) return null;
    const data = await this.read();
    for (const account of data.accounts) {
      const passkey = account.passkeys.find((item) => item.id === credentialId);
      if (passkey) return { account, passkey };
    }
    return null;
  }

  async addPasskey(accountId, passkey, { requireEmpty = false } = {}) {
    let outcome = 'account-not-found';
    await this.update((data) => {
      const account = data.accounts.find((item) => item.id === accountId);
      if (!account) return;
      if (data.accounts.some((item) => item.passkeys.some((candidate) => candidate.id === passkey.id))) {
        outcome = 'duplicate';
        return;
      }
      if (requireEmpty && account.passkeys.length > 0) {
        outcome = 'bootstrap-used';
        return;
      }
      account.passkeys.push(passkey);
      outcome = 'created';
    });
    return outcome;
  }

  async updatePasskeyUsage(accountId, credentialId, counter, lastUsedAt, expectedCounter) {
    let updated = false;
    await this.update((data) => {
      const account = data.accounts.find((item) => item.id === accountId);
      const passkey = account?.passkeys.find((item) => item.id === credentialId);
      if (!passkey) return;
      if (passkey.counter !== expectedCounter) return;
      passkey.counter = counter;
      passkey.lastUsedAt = lastUsedAt;
      updated = true;
    });
    return updated;
  }

  async deletePasskey(accountId, credentialId) {
    let outcome = 'not-found';
    await this.update((data) => {
      const account = data.accounts.find((item) => item.id === accountId);
      if (!account) {
        outcome = 'account-not-found';
        return;
      }
      const index = account.passkeys.findIndex((item) => item.id === credentialId);
      if (index < 0) return;
      if (account.passkeys.length <= 1) {
        outcome = 'last-passkey';
        return;
      }
      account.passkeys.splice(index, 1);
      outcome = 'deleted';
    });
    return outcome;
  }

  async update(mutator) {
    const operation = this.#writeQueue.then(async () => {
      const current = structuredClone(await this.read());
      const result = await mutator(current);
      validateData(current);
      await this.#write(current);
      return result;
    });
    this.#writeQueue = operation.catch(() => undefined);
    return operation;
  }

  async #write(data) {
    const directory = path.dirname(this.#filePath);
    const temporaryPath = path.join(directory, `.${path.basename(this.#filePath)}.${randomUUID()}.tmp`);
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, this.#filePath);
  }
}
