export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [part, ''];
      return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
    }),
  );
}

export function setSessionCookie(res, id, { secure, maxAgeSeconds }) {
  const parts = [
    `sid=${encodeURIComponent(id)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res, secure) {
  const parts = ['sid=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
