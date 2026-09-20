import postgres from 'postgres';
import { createApp, issueBootstrapCodes } from './app.js';
import { config } from './config.js';
import { EphemeralState } from './ephemeral-state.js';
import { PostgresState } from './postgres-state.js';
import { PostgresStore } from './postgres-store.js';
import { FileStore } from './store.js';

export async function createRuntime() {
  if (config.databaseUrl) {
    if (!config.bootstrapCodeHashes['account-owner-demo'] || !config.bootstrapCodeHashes['account-peer-demo']) {
      throw new Error('DATABASE_URL 사용 시 OWNER_SETUP_CODE_HASH와 PEER_SETUP_CODE_HASH가 필요합니다.');
    }
    for (const hash of Object.values(config.bootstrapCodeHashes)) {
      if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error('설정 코드 해시는 64자리 SHA-256 16진수여야 합니다.');
    }
    const sql = postgres(config.databaseUrl, {
      max: 1,
      prepare: false,
      ssl: 'require',
      connect_timeout: 10,
      idle_timeout: 20,
    });
    const store = new PostgresStore(sql);
    await store.init();
    const state = new PostgresState({ sql, ...config });
    return { app: createApp({ config, store, state }), store, state, bootstrapCodes: [], sql };
  }

  const store = new FileStore(config.dataFile);
  await store.init();
  const state = new EphemeralState(config);
  const bootstrapCodes = await issueBootstrapCodes({ store, state });
  return { app: createApp({ config, store, state }), store, state, bootstrapCodes, sql: null };
}
