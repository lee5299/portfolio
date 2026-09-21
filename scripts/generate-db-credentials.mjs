import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';

const iterations = 4096;
const salt = randomBytes(16);
const password = randomBytes(32).toString('base64url');
const saltedPassword = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const clientKey = createHmac('sha256', saltedPassword).update('Client Key').digest();
const storedKey = createHash('sha256').update(clientKey).digest();
const serverKey = createHmac('sha256', saltedPassword).update('Server Key').digest();
const verifier = [
  `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}`,
  `${storedKey.toString('base64')}:${serverKey.toString('base64')}`,
].join('$');

console.log('1. 아래 DB 비밀번호를 비밀번호 관리자에 즉시 저장하세요.');
console.log(password);
console.log('\n2. 아래 SQL만 Supabase SQL Editor에서 실행하세요. 평문 비밀번호는 포함되지 않습니다.');
console.log(`alter role portfolio_passkey_app with login password '${verifier}';`);
console.log('\n3. 터미널 출력과 SQL Editor의 임시 쿼리를 닫고 저장하지 마세요.');
