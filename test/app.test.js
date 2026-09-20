import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { createApp } from '../server/app.js';
import { EphemeralState } from '../server/ephemeral-state.js';
import { FileStore } from '../server/store.js';

let directory;
let store;
let state;
let server;
let baseUrl;
let config;

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'passkey-portfolio-'));
  store = new FileStore(path.join(directory, 'store.json'));
  await store.init();
  config = {
    origin: 'http://localhost:3000',
    rpId: 'localhost',
    rpName: 'Test Portfolio',
    ceremonyTtlMs: 60_000,
    sessionTtlMs: 60_000,
    secureCookies: false,
  };
  state = new EphemeralState(config);
  const app = createApp({ config, store, state, logger: { error() {} } });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(directory, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { Origin: config.origin, ...(options.headers ?? {}) },
  });
}

async function addPasskeys(accountId, ids) {
  await store.update((data) => {
    const account = data.accounts.find((item) => item.id === accountId);
    for (const id of ids) {
      account.passkeys.push({
        id,
        publicKey: Buffer.from(`public-key-${id}`).toString('base64url'),
        counter: 0,
        transports: ['internal'],
        deviceType: 'singleDevice',
        backedUp: false,
        name: `테스트 키 ${id}`,
        createdAt: '2026-09-20T00:00:00.000Z',
      });
    }
  });
}

async function sessionCookie(accountId) {
  return `sid=${await state.createSession(accountId)}`;
}

test('공개 HTML에는 비공개 자료가 없고 비인증 API는 401을 반환한다', async () => {
  const page = await request('/');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.doesNotMatch(html, /가상 프로젝트의 다음 작업/);
  assert.doesNotMatch(html, /교차 계정 접근 거절 시험용/);

  const privateResponse = await request('/api/private-items');
  assert.equal(privateResponse.status, 401);
  assert.equal((await privateResponse.json()).code, 'AUTH_REQUIRED');
});

test('로그인 요청마다 새 challenge를 발급한다', async () => {
  const first = await request('/api/authentication/options', { method: 'POST' });
  const second = await request('/api/authentication/options', { method: 'POST' });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const firstBody = await first.json();
  const secondBody = await second.json();
  assert.notEqual(firstBody.options.challenge, secondBody.options.challenge);
  assert.notEqual(firstBody.ceremonyId, secondBody.ceremonyId);
});

test('등록 요청마다 새 challenge를 발급하고 완료 전에는 패스키를 저장하지 않는다', async () => {
  const setupCode = state.issueBootstrapCode('account-owner-demo');
  const requestBody = JSON.stringify({ accountAlias: 'owner-demo', passkeyName: '테스트 기기', setupCode });
  const first = await request('/api/bootstrap/registration/options', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody,
  });
  const second = await request('/api/bootstrap/registration/options', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody,
  });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  const firstBody = await first.json();
  const secondBody = await second.json();
  assert.notEqual(firstBody.options.challenge, secondBody.options.challenge);

  const data = await store.read();
  assert.equal(data.accounts.find((item) => item.id === 'account-owner-demo').passkeys.length, 0);
});

test('최초 등록용 저장은 첫 패스키가 생긴 뒤 다시 사용할 수 없다', async () => {
  const first = await store.addPasskey('account-owner-demo', {
    id: 'first-bootstrap-key',
    publicKey: Buffer.from('first-public-key').toString('base64url'),
    counter: 0,
    transports: ['internal'],
    deviceType: 'multiDevice',
    backedUp: true,
    name: '첫 패스키',
    createdAt: '2026-09-20T00:00:00.000Z',
  }, { requireEmpty: true });
  const replay = await store.addPasskey('account-owner-demo', {
    id: 'second-bootstrap-key',
    publicKey: Buffer.from('second-public-key').toString('base64url'),
    counter: 0,
    transports: ['internal'],
    deviceType: 'multiDevice',
    backedUp: true,
    name: '재사용 시도',
    createdAt: '2026-09-20T00:00:01.000Z',
  }, { requireEmpty: true });

  assert.equal(first, 'created');
  assert.equal(replay, 'bootstrap-used');
  const account = await store.getAccountById('account-owner-demo');
  assert.deepEqual(account.passkeys.map((item) => item.id), ['first-bootstrap-key']);
});

test('사용된 로그인 ceremony는 다시 사용할 수 없다', async () => {
  const optionsResponse = await request('/api/authentication/options', { method: 'POST' });
  const { ceremonyId } = await optionsResponse.json();
  const body = JSON.stringify({ ceremonyId, response: { id: 'unknown-credential' } });

  const first = await request('/api/authentication/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(first.status, 401);
  assert.equal((await first.json()).code, 'UNKNOWN_PASSKEY');

  const replay = await request('/api/authentication/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(replay.status, 400);
  assert.equal((await replay.json()).code, 'CEREMONY_REJECTED');
});

test('인증 계정의 자료만 반환하고 다른 계정 경로는 403으로 거절한다', async () => {
  const before = await store.read();
  const beforeCounts = before.accounts.map((account) => [account.id, account.privateItems.length]);
  const ownerCookie = await sessionCookie('account-owner-demo');
  const own = await request('/api/accounts/account-owner-demo/private-items', { headers: { Cookie: ownerCookie } });
  assert.equal(own.status, 200);
  assert.equal((await own.json()).items.length, 3);

  const ownerToPeer = await request('/api/accounts/account-peer-demo/private-items', { headers: { Cookie: ownerCookie } });
  assert.equal(ownerToPeer.status, 403);
  assert.equal((await ownerToPeer.json()).code, 'ACCOUNT_SCOPE_REJECTED');

  const peerCookie = await sessionCookie('account-peer-demo');
  const peerToOwner = await request('/api/accounts/account-owner-demo/private-items', { headers: { Cookie: peerCookie } });
  assert.equal(peerToOwner.status, 403);
  assert.equal((await peerToOwner.json()).code, 'ACCOUNT_SCOPE_REJECTED');

  const after = await store.read();
  assert.deepEqual(after.accounts.map((account) => [account.id, account.privateItems.length]), beforeCounts);
});

test('두 패스키 중 하나는 삭제할 수 있지만 마지막 패스키는 409로 차단한다', async () => {
  await addPasskeys('account-owner-demo', ['credential-one', 'credential-two']);
  const cookie = await sessionCookie('account-owner-demo');

  const deletion = await request('/api/passkeys/credential-one', { method: 'DELETE', headers: { Cookie: cookie } });
  assert.equal(deletion.status, 204);

  const lastDeletion = await request('/api/passkeys/credential-two', { method: 'DELETE', headers: { Cookie: cookie } });
  assert.equal(lastDeletion.status, 409);
  assert.equal((await lastDeletion.json()).code, 'LAST_PASSKEY_BLOCKED');

  const data = await store.read();
  const account = data.accounts.find((item) => item.id === 'account-owner-demo');
  assert.deepEqual(account.passkeys.map((item) => item.id), ['credential-two']);
});

test('로그아웃하면 같은 세션 쿠키로 비공개 자료를 다시 읽을 수 없다', async () => {
  const cookie = await sessionCookie('account-owner-demo');
  const before = await request('/api/private-items', { headers: { Cookie: cookie } });
  assert.equal(before.status, 200);

  const logout = await request('/api/logout', { method: 'POST', headers: { Cookie: cookie } });
  assert.equal(logout.status, 204);

  const after = await request('/api/private-items', { headers: { Cookie: cookie } });
  assert.equal(after.status, 401);
});

test('허용되지 않은 Origin의 변경 요청을 거절한다', async () => {
  const response = await fetch(`${baseUrl}/api/authentication/options`, {
    method: 'POST',
    headers: { Origin: 'https://attacker.invalid' },
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'ORIGIN_REJECTED');
});

test('런타임 파일에는 가상 계정과 공개키 필드만 저장할 수 있다', async () => {
  await addPasskeys('account-owner-demo', ['credential-public']);
  const raw = await readFile(path.join(directory, 'store.json'), 'utf8');
  assert.match(raw, /"publicKey"/);
  assert.doesNotMatch(raw, /privateKey|password|@gmail\.com|github\.com\//i);
});
