import { AdminActivation } from '../components/AdminActivation.js';

let csrfToken = '';

async function readResponse(response) {
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || body.error || 'La solicitud no pudo completarse.');
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function adminApi(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(`/api${path}`, { ...options, method, headers, credentials: 'same-origin' });
  return readResponse(response);
}

function activationTokenFromHash() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash).get('admin-activate');
}

async function activateFromLink(token) {
  document.body.insertAdjacentHTML('beforeend', AdminActivation());
  const form = document.getElementById('adminActivationForm');
  const errorEl = document.getElementById('activationError');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const deviceName = document.getElementById('activationDeviceName').value.trim();
    try {
      await readResponse(await fetch('/api/auth/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ token, deviceName }) }));
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      window.location.reload();
    } catch (error) { errorEl.textContent = error.message; }
  });
}

function mountAdminToolbar() {
  const toolbar = document.createElement('button');
  toolbar.className = 'admin-toolbar-btn';
  toolbar.type = 'button';
  toolbar.setAttribute('aria-label', 'Abrir administración');
  toolbar.innerHTML = '<i class="fas fa-sliders-h"></i><span>Administrar</span>';
  toolbar.addEventListener('click', () => window.openAdminPanel?.());
  document.body.appendChild(toolbar);
}

async function initAuthenticatedAdmin(session) {
  csrfToken = session.csrfToken;
  const { AdminPanel } = await import('../components/AdminPanel.js');
  document.body.insertAdjacentHTML('beforeend', AdminPanel());
  await import('./admin.js');
  const { initAdminDeviceManager } = await import('./adminDeviceManager.js');
  initAdminDeviceManager({ currentDeviceId: session.device.id });
  mountAdminToolbar();
}

async function initAdminAccess() {
  const activationToken = activationTokenFromHash();
  if (activationToken) { await activateFromLink(activationToken); return; }
  try {
    const session = await adminApi('/auth/session');
    if (session.authenticated && session.role === 'ADMIN') await initAuthenticatedAdmin(session);
  } catch (error) { console.warn('No fue posible comprobar la sesión administrativa.', error); }
}

initAdminAccess();
