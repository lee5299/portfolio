import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresStore } from '../server/postgres-store.js';

function failingSql(code) {
  return async () => {
    const error = new Error('database error');
    error.code = code;
    throw error;
  };
}

test('DB 비밀번호 오류를 스키마 누락으로 잘못 안내하지 않는다', async () => {
  await assert.rejects(
    new PostgresStore(failingSql('28P01')).init(),
    /DATABASE_URL의 사용자명과 비밀번호/,
  );
});

test('DB 객체 누락과 역할 권한 오류를 구분한다', async () => {
  await assert.rejects(new PostgresStore(failingSql('42P01')).init(), /Supabase 스키마가 없습니다/);
  await assert.rejects(new PostgresStore(failingSql('42501')).init(), /역할 권한이 부족합니다/);
});
