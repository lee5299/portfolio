import path from 'node:path';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const origin = process.env.APP_ORIGIN ?? `http://localhost:${port}`;
const originUrl = new URL(origin);
const rpId = process.env.RP_ID ?? originUrl.hostname;
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
const runningOnVercel = process.env.VERCEL === '1';

if (runningOnVercel) {
  for (const name of ['DATABASE_URL', 'APP_ORIGIN', 'RP_ID', 'OWNER_SETUP_CODE_HASH', 'PEER_SETUP_CODE_HASH']) {
    if (!process.env[name]) throw new Error(`Vercel 배포에는 ${name} 환경변수가 필요합니다.`);
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT는 1~65535 범위의 정수여야 합니다.');
}
if (originUrl.protocol !== 'https:' && !loopbackHosts.has(originUrl.hostname)) {
  throw new Error('WebAuthn 운영 origin은 HTTPS여야 합니다.');
}
if (originUrl.hostname !== rpId && !originUrl.hostname.endsWith(`.${rpId}`)) {
  throw new Error('RP_ID는 APP_ORIGIN 호스트와 같거나 그 상위 등록 도메인이어야 합니다.');
}

export const config = Object.freeze({
  port,
  origin: originUrl.origin,
  rpId,
  rpName: process.env.RP_NAME ?? 'Private Portfolio',
  dataFile: process.env.RUNTIME_DATA_FILE
    ? path.resolve(process.env.RUNTIME_DATA_FILE)
    : path.resolve('runtime-data', 'store.json'),
  ceremonyTtlMs: 5 * 60 * 1000,
  sessionTtlMs: 8 * 60 * 60 * 1000,
  secureCookies: originUrl.protocol === 'https:',
  databaseUrl: process.env.DATABASE_URL,
  runningOnVercel,
  bootstrapCodeHashes: Object.freeze({
    'account-owner-demo': process.env.OWNER_SETUP_CODE_HASH,
    'account-peer-demo': process.env.PEER_SETUP_CODE_HASH,
  }),
});
