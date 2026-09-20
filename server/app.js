import express from 'express';
import path from 'node:path';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { clearSessionCookie, parseCookies, setSessionCookie } from './http.js';

class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function passkeyForVerification(passkey) {
  return {
    id: passkey.id,
    publicKey: Buffer.from(passkey.publicKey, 'base64url'),
    counter: passkey.counter,
    transports: passkey.transports,
  };
}

function cleanPasskey(passkey) {
  return {
    id: passkey.id,
    idPreview: `${passkey.id.slice(0, 8)}…${passkey.id.slice(-6)}`,
    name: passkey.name,
    createdAt: passkey.createdAt,
    deviceType: passkey.deviceType,
    backedUp: passkey.backedUp,
    transports: passkey.transports ?? [],
  };
}

function validPasskeyName(value) {
  return typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 40;
}

export function createApp({ config, store, state, logger = console }) {
  const app = express();
  const publicDirectory = path.resolve('public');

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'publickey-credentials-create=(self), publickey-credentials-get=(self)');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    next();
  });
  app.use(express.json({ limit: '48kb' }));

  app.use('/api', async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && origin !== config.origin) {
      return next(new HttpError(403, '허용되지 않은 요청 출처입니다.', 'ORIGIN_REJECTED'));
    }
    const sid = parseCookies(req.get('cookie')).sid;
    const session = await state.getSession(sid);
    req.auth = session ? { ...session, sid } : null;
    next();
  });

  function requireAuth(req, _res, next) {
    if (!req.auth) return next(new HttpError(401, '패스키 로그인이 필요합니다.', 'AUTH_REQUIRED'));
    next();
  }

  async function registrationOptions(account, passkeyName, bootstrap) {
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpId,
      userID: Buffer.from(account.webAuthnUserId, 'base64url'),
      userName: account.alias,
      userDisplayName: account.displayName,
      attestationType: 'none',
      excludeCredentials: account.passkeys.map((passkey) => ({
        id: passkey.id,
        transports: passkey.transports,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });
    const ceremonyId = await state.createCeremony({
      type: 'registration',
      accountId: account.id,
      challenge: options.challenge,
      passkeyName: passkeyName.trim(),
      bootstrap,
    });
    return { ceremonyId, options };
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/session', async (req, res) => {
    if (!req.auth) return res.json({ authenticated: false });
    const account = await store.getAccountById(req.auth.accountId);
    if (!account) {
      await state.deleteSession(req.auth.sid);
      clearSessionCookie(res, config.secureCookies);
      return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, account: { id: account.id, alias: account.alias, displayName: account.displayName } });
  });

  app.post('/api/bootstrap/registration/options', async (req, res, next) => {
    const { accountAlias, passkeyName, setupCode } = req.body ?? {};
    if (!validPasskeyName(passkeyName)) return next(new HttpError(400, '패스키 이름은 2~40자로 입력하세요.', 'INVALID_PASSKEY_NAME'));
    const account = await store.getAccountByAlias(accountAlias);
    if (!account || account.passkeys.length > 0 || !await state.verifyBootstrapCode(account.id, setupCode)) {
      return next(new HttpError(403, '등록 코드가 유효하지 않습니다.', 'BOOTSTRAP_REJECTED'));
    }
    res.json(await registrationOptions(account, passkeyName, true));
  });

  app.post('/api/passkeys/registration/options', requireAuth, async (req, res, next) => {
    const { passkeyName } = req.body ?? {};
    if (!validPasskeyName(passkeyName)) return next(new HttpError(400, '패스키 이름은 2~40자로 입력하세요.', 'INVALID_PASSKEY_NAME'));
    const account = await store.getAccountById(req.auth.accountId);
    if (!account) return next(new HttpError(401, '인증 계정을 찾을 수 없습니다.', 'AUTH_REQUIRED'));
    res.json(await registrationOptions(account, passkeyName, false));
  });

  app.post('/api/passkeys/registration/verify', async (req, res, next) => {
    const { ceremonyId, response } = req.body ?? {};
    const ceremony = await state.consumeCeremony(ceremonyId, 'registration');
    if (!ceremony) return next(new HttpError(400, '등록 질문이 만료되었거나 이미 사용되었습니다.', 'CEREMONY_REJECTED'));

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return next(new HttpError(400, '패스키 등록 검증에 실패했습니다.', 'REGISTRATION_FAILED'));
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const outcome = await store.addPasskey(ceremony.accountId, {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: ceremony.passkeyName,
      createdAt: new Date().toISOString(),
    }, { requireEmpty: ceremony.bootstrap });
    if (outcome === 'account-not-found') throw new HttpError(404, '등록 대상 계정을 찾을 수 없습니다.', 'ACCOUNT_NOT_FOUND');
    if (outcome === 'duplicate') throw new HttpError(409, '이미 등록된 패스키입니다.', 'PASSKEY_EXISTS');
    if (outcome === 'bootstrap-used') throw new HttpError(409, '최초 등록이 이미 완료되었습니다.', 'BOOTSTRAP_ALREADY_USED');

    if (ceremony.bootstrap) await state.consumeBootstrapCode(ceremony.accountId);
    const sid = await state.createSession(ceremony.accountId);
    setSessionCookie(res, sid, { secure: config.secureCookies, maxAgeSeconds: Math.floor(config.sessionTtlMs / 1000) });
    res.status(201).json({ verified: true });
  });

  app.post('/api/authentication/options', async (_req, res) => {
    const options = await generateAuthenticationOptions({
      rpID: config.rpId,
      userVerification: 'required',
    });
    const ceremonyId = await state.createCeremony({ type: 'authentication', challenge: options.challenge });
    res.json({ ceremonyId, options });
  });

  app.post('/api/authentication/verify', async (req, res, next) => {
    const { ceremonyId, response } = req.body ?? {};
    const ceremony = await state.consumeCeremony(ceremonyId, 'authentication');
    if (!ceremony) return next(new HttpError(400, '로그인 질문이 만료되었거나 이미 사용되었습니다.', 'CEREMONY_REJECTED'));

    const credential = await store.getAccountByCredentialId(response?.id);
    const account = credential?.account;
    const passkey = credential?.passkey;
    if (!account || !passkey) return next(new HttpError(401, '등록되지 않은 패스키입니다.', 'UNKNOWN_PASSKEY'));

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ceremony.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpId,
      credential: passkeyForVerification(passkey),
      requireUserVerification: true,
    });
    if (!verification.verified) return next(new HttpError(401, '패스키 서명 검증에 실패했습니다.', 'AUTHENTICATION_FAILED'));

    const updated = await store.updatePasskeyUsage(
      account.id,
      passkey.id,
      verification.authenticationInfo.newCounter,
      new Date().toISOString(),
      passkey.counter,
    );
    if (!updated) throw new HttpError(401, '삭제된 패스키입니다.', 'UNKNOWN_PASSKEY');

    const sid = await state.createSession(account.id);
    setSessionCookie(res, sid, { secure: config.secureCookies, maxAgeSeconds: Math.floor(config.sessionTtlMs / 1000) });
    res.json({ verified: true });
  });

  app.post('/api/logout', async (req, res) => {
    await state.deleteSession(req.auth?.sid);
    clearSessionCookie(res, config.secureCookies);
    res.status(204).end();
  });

  app.get('/api/private-items', requireAuth, async (req, res, next) => {
    const account = await store.getAccountById(req.auth.accountId);
    if (!account) return next(new HttpError(401, '인증 계정을 찾을 수 없습니다.', 'AUTH_REQUIRED'));
    res.json({ items: account.privateItems });
  });

  app.get('/api/accounts/:accountId/private-items', requireAuth, async (req, res, next) => {
    if (req.params.accountId !== req.auth.accountId) {
      return next(new HttpError(403, '다른 계정의 비공개 자료에는 접근할 수 없습니다.', 'ACCOUNT_SCOPE_REJECTED'));
    }
    const account = await store.getAccountById(req.auth.accountId);
    if (!account) return next(new HttpError(401, '인증 계정을 찾을 수 없습니다.', 'AUTH_REQUIRED'));
    res.json({ items: account.privateItems });
  });

  app.get('/api/passkeys', requireAuth, async (req, res) => {
    const account = await store.getAccountById(req.auth.accountId);
    res.json({ passkeys: (account?.passkeys ?? []).map(cleanPasskey), policy: { minimum: 1, lastDeletionBlocked: true } });
  });

  app.delete('/api/passkeys/:credentialId', requireAuth, async (req, res, next) => {
    const outcome = await store.deletePasskey(req.auth.accountId, req.params.credentialId);
    if (outcome === 'account-not-found') throw new HttpError(401, '인증 계정을 찾을 수 없습니다.', 'AUTH_REQUIRED');
    if (outcome === 'not-found') throw new HttpError(404, '패스키를 찾을 수 없습니다.', 'PASSKEY_NOT_FOUND');
    if (outcome === 'last-passkey') {
      throw new HttpError(409, '마지막 패스키는 삭제할 수 없습니다. 새 패스키를 먼저 등록하세요.', 'LAST_PASSKEY_BLOCKED');
    }
    res.status(204).end();
  });

  app.use(express.static(publicDirectory, { index: 'index.html', maxAge: 0 }));

  app.use((error, req, res, _next) => {
    const status = error.status ?? 500;
    if (status >= 500) logger.error(error);
    res.status(status).json({
      error: status >= 500 ? '서버 요청을 처리하지 못했습니다.' : error.message,
      code: error.code ?? 'INTERNAL_ERROR',
      path: req.path,
    });
  });

  return app;
}

export async function issueBootstrapCodes({ store, state }) {
  const aliases = ['owner-demo', 'peer-demo'];
  const codes = [];
  for (const alias of aliases) {
    const account = await store.getAccountByAlias(alias);
    if (account && account.passkeys.length === 0 && typeof state.issueBootstrapCode === 'function') {
      codes.push({ alias, code: await state.issueBootstrapCode(account.id) });
    }
  }
  return codes;
}
