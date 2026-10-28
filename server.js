import express from 'express';
import path from 'node:path';

// 공개 소개 페이지(public/)는 DB·환경변수와 무관하게 항상 응답한다.
// 패스키 API 런타임은 첫 요청 때 늦게 초기화하고, 실패하면 다음 요청에서 다시 시도한다.
const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'publickey-credentials-create=(self), publickey-credentials-get=(self)');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  next();
});
app.use(express.static(path.resolve('public'), { index: 'index.html', maxAge: 0 }));

let runtimePromise = null;

function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = import('./server/runtime.js')
      .then(({ createRuntime }) => createRuntime())
      .catch((error) => {
        runtimePromise = null;
        throw error;
      });
  }
  return runtimePromise;
}

app.use(async (req, res, next) => {
  try {
    const { app: runtimeApp } = await loadRuntime();
    runtimeApp(req, res, next);
  } catch (error) {
    console.error('Runtime initialization failed:', error);
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({
        error: '비공개 공간 서버를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도하세요.',
        code: 'RUNTIME_UNAVAILABLE',
      });
    }
    res.status(503).type('text/plain; charset=utf-8').send('서버를 일시적으로 사용할 수 없습니다. 소개 페이지: /index.html');
  }
});

export default app;
