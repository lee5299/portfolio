import { createHash, randomBytes } from 'node:crypto';

const code = randomBytes(24).toString('base64url');
const hash = createHash('sha256').update(code).digest('hex');

console.log(`Setup code: ${code}`);
console.log(`SHA-256 hash: ${hash}`);
console.log('Store the code in a password manager and put only the hash in the deployment environment variable.');
