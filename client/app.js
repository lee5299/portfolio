import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

const elements = {
  privateSection: document.querySelector('#private-space'),
  privateToggle: document.querySelector('#private-toggle'),
  privateToggleLabel: document.querySelector('#private-toggle-label'),
  privateToggleSymbol: document.querySelector('#private-toggle-symbol'),
  privateContent: document.querySelector('#private-content'),
  authState: document.querySelector('#auth-state'),
  locked: document.querySelector('#locked-panel'),
  unlocked: document.querySelector('#unlocked-panel'),
  login: document.querySelector('#login-btn'),
  logout: document.querySelector('#logout-btn'),
  showSetup: document.querySelector('#show-setup-btn'),
  setup: document.querySelector('#setup-panel'),
  setupAccount: document.querySelector('#setup-account'),
  setupName: document.querySelector('#setup-name'),
  setupCode: document.querySelector('#setup-code'),
  accountName: document.querySelector('#account-name'),
  privateItems: document.querySelector('#private-items'),
  passkeyList: document.querySelector('#passkey-list'),
  addPasskey: document.querySelector('#add-passkey-form'),
  newPasskeyName: document.querySelector('#new-passkey-name'),
  status: document.querySelector('#status-message'),
  toggleProjects: document.querySelector('#toggle-projects-btn'),
};

function setPrivateExpanded(expanded) {
  elements.privateContent.hidden = !expanded;
  elements.privateSection.classList.toggle('is-expanded', expanded);
  elements.privateToggle.setAttribute('aria-expanded', String(expanded));
  elements.privateToggleLabel.textContent = expanded ? '나만의 자리 접기' : '나만의 자리 열기';
  elements.privateToggleSymbol.textContent = expanded ? '−' : '+';
}

async function openPrivateSpace() {
  if (!elements.privateContent.hidden) return;
  elements.unlocked.hidden = true;
  setPrivateExpanded(true);
  try {
    await refreshPrivateSpace();
  } catch (error) {
    elements.locked.hidden = false;
    showStatus(error.message, 'error');
  }
}

elements.privateToggle.addEventListener('click', () => {
  if (elements.privateContent.hidden) openPrivateSpace();
  else setPrivateExpanded(false);
});

document.querySelector('.nav-private').addEventListener('click', () => {
  openPrivateSpace();
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error ?? `요청이 실패했습니다 (${response.status}).`);
    error.code = body.code;
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function showStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.dataset.type = type;
}

function humanDate(value) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}

function renderItems(items) {
  elements.privateItems.replaceChildren(...items.map((item) => {
    const article = document.createElement('article');
    const title = document.createElement('h5');
    const body = document.createElement('p');
    title.textContent = item.title;
    body.textContent = item.body;
    article.append(title, body);
    return article;
  }));
}

function renderPasskeys(passkeys) {
  elements.passkeyList.replaceChildren(...passkeys.map((passkey) => {
    const item = document.createElement('li');
    const description = document.createElement('div');
    const name = document.createElement('strong');
    const meta = document.createElement('span');
    const button = document.createElement('button');
    name.textContent = passkey.name;
    meta.textContent = `${humanDate(passkey.createdAt)} · ${passkey.idPreview}`;
    description.append(name, meta);
    button.type = 'button';
    button.className = 'danger-button';
    button.textContent = '삭제';
    button.addEventListener('click', () => deletePasskey(passkey.id));
    item.append(description, button);
    return item;
  }));
}

async function refreshPrivateSpace() {
  const session = await api('/api/session');
  const authenticated = session.authenticated;
  elements.locked.hidden = authenticated;
  elements.unlocked.hidden = true;
  elements.authState.textContent = authenticated ? '열림' : '잠김';
  elements.authState.classList.toggle('is-open', authenticated);
  if (!authenticated) {
    elements.accountName.textContent = '';
    elements.privateItems.replaceChildren();
    elements.passkeyList.replaceChildren();
    return;
  }

  const [privateData, passkeyData] = await Promise.all([api('/api/private-items'), api('/api/passkeys')]);
  elements.accountName.textContent = `${session.account.displayName} (${session.account.alias})`;
  renderItems(privateData.items);
  renderPasskeys(passkeyData.passkeys);
  elements.unlocked.hidden = false;
}

async function finishRegistration(payload) {
  const credential = await startRegistration({ optionsJSON: payload.options });
  await api('/api/passkeys/registration/verify', {
    method: 'POST',
    body: JSON.stringify({ ceremonyId: payload.ceremonyId, response: credential }),
  });
  showStatus('패스키를 등록하고 보호 공간을 열었습니다.', 'success');
  await refreshPrivateSpace();
}

elements.login.addEventListener('click', async () => {
  try {
    showStatus('기기에 패스키 확인을 요청하고 있습니다.');
    const payload = await api('/api/authentication/options', { method: 'POST', body: '{}' });
    const credential = await startAuthentication({ optionsJSON: payload.options });
    await api('/api/authentication/verify', {
      method: 'POST',
      body: JSON.stringify({ ceremonyId: payload.ceremonyId, response: credential }),
    });
    showStatus('패스키 확인에 성공했습니다.', 'success');
    await refreshPrivateSpace();
  } catch (error) {
    showStatus(error.name === 'NotAllowedError' ? '패스키 확인이 취소되었거나 제한 시간 안에 완료되지 않았습니다.' : error.message, 'error');
  }
});

elements.showSetup.addEventListener('click', () => {
  const willOpen = elements.setup.hidden;
  elements.setup.hidden = !willOpen;
  elements.showSetup.setAttribute('aria-expanded', String(willOpen));
});

elements.setup.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    showStatus('최초 패스키 등록을 준비하고 있습니다.');
    const payload = await api('/api/bootstrap/registration/options', {
      method: 'POST',
      body: JSON.stringify({
        accountAlias: elements.setupAccount.value,
        passkeyName: elements.setupName.value,
        setupCode: elements.setupCode.value,
      }),
    });
    await finishRegistration(payload);
    elements.setup.reset();
  } catch (error) {
    showStatus(error.name === 'NotAllowedError' ? '패스키 등록을 취소했습니다. 서버에는 아무것도 저장되지 않았습니다.' : error.message, 'error');
  }
});

elements.addPasskey.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    showStatus('새 패스키 등록을 준비하고 있습니다.');
    const payload = await api('/api/passkeys/registration/options', {
      method: 'POST',
      body: JSON.stringify({ passkeyName: elements.newPasskeyName.value }),
    });
    await finishRegistration(payload);
    elements.addPasskey.reset();
  } catch (error) {
    showStatus(error.name === 'NotAllowedError' ? '패스키 등록을 취소했습니다. 서버에는 아무것도 저장되지 않았습니다.' : error.message, 'error');
  }
});

async function deletePasskey(id) {
  try {
    await api(`/api/passkeys/${encodeURIComponent(id)}`, { method: 'DELETE' });
    showStatus('패스키를 삭제했습니다. 남은 패스키로 다시 로그인할 수 있습니다.', 'success');
    await refreshPrivateSpace();
  } catch (error) {
    showStatus(error.message, error.status === 409 ? 'warning' : 'error');
  }
}

elements.logout.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST', body: '{}' });
    showStatus('로그아웃했습니다. 기존 세션으로 비공개 자료를 요청할 수 없습니다.', 'success');
    await refreshPrivateSpace();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

elements.toggleProjects.addEventListener('click', () => {
  const expanded = elements.toggleProjects.getAttribute('aria-expanded') === 'true';
  document.querySelectorAll('.extra-project').forEach((card) => card.classList.toggle('is-visible', !expanded));
  elements.toggleProjects.setAttribute('aria-expanded', String(!expanded));
  elements.toggleProjects.textContent = expanded ? '사례 더 보기 (+2) ↓' : '사례 접기 ↑';
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.fade-in').forEach((element) => element.classList.add('visible'));
}

refreshPrivateSpace().catch((error) => showStatus(error.message, 'error'));
