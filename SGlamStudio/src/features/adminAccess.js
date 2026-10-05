import { AdminActivation } from '../components/AdminActivation.js';

let csrfToken = '';

async function readResponse(response) {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || body.error || 'La solicitud no pudo completarse.');
    error.status = response.status;
    error.code = body.error;
    error.details = body.details;
    throw error;
  }
  return body;
}

export async function adminApi(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  const response = await fetch(`/api${path}`, {
    ...options,
    method,
    headers,
    credentials: 'same-origin',
  });
  if (response.status === 401 && path !== '/auth/session') {
    window.setTimeout(() => window.location.reload(), 800);
  }
  return readResponse(response);
}

function activationTokenFromHash() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash).get('admin-activate');
}

async function activateFromLink(token) {
  document.body.insertAdjacentHTML('beforeend', AdminActivation());
  const form = document.getElementById('adminActivationForm');
  const nameInput = document.getElementById('activationDeviceName');
  const errorElement = document.getElementById('activationError');
  nameInput.focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorElement.textContent = '';
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await readResponse(await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token, deviceName: nameInput.value.trim() }),
      }));
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      window.location.reload();
    } catch (error) {
      errorElement.textContent = error.message;
      submit.disabled = false;
      nameInput.focus();
    }
  });
}

function mountAdminToolbar(openAdminPanel) {
  const toolbar = document.createElement('button');
  toolbar.className = 'admin-toolbar-btn';
  toolbar.type = 'button';
  toolbar.setAttribute('aria-label', 'Abrir administración');
  const icon = document.createElement('i');
  icon.className = 'fas fa-sliders-h';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = 'Administrar';
  toolbar.append(icon, label);
  toolbar.addEventListener('click', openAdminPanel);
  document.body.appendChild(toolbar);
}

async function initAuthenticatedAdmin(session) {
  csrfToken = session.csrfToken;
  const [{ AdminPanel }, adminModule, { initAdminDeviceManager }] = await Promise.all([
    import('../components/AdminPanel.js'),
    import('./admin.js'),
    import('./adminDeviceManager.js'),
  ]);
  document.body.insertAdjacentHTML('beforeend', AdminPanel());
  adminModule.initAdminPanel();
  initAdminDeviceManager();
  mountAdminToolbar(adminModule.openAdminPanel);
}

async function initAdminAccess() {
  const activationToken = activationTokenFromHash();
  if (activationToken) {
    await activateFromLink(activationToken);
    return;
  }
  try {
    const session = await adminApi('/auth/session');
    if (session.authenticated && session.role === 'ADMIN') await initAuthenticatedAdmin(session);
  } catch (error) {
    console.warn('No fue posible comprobar la sesión administrativa.', error);
  }
}

initAdminAccess();
