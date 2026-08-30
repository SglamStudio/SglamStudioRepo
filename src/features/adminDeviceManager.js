import { adminApi } from './adminAccess.js';

function dateLabel(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function renderDevices(devices) {
  const list = document.getElementById('adminDevicesList');
  list.replaceChildren();
  for (const device of devices) {
    const row = document.createElement('div');
    row.className = 'admin-device-row';
    const info = document.createElement('div');
    info.className = 'admin-device-info';
    const name = document.createElement('strong');
    name.textContent = device.name;
    const status = document.createElement('span');
    status.textContent = device.revoked_at ? 'Revocado' : `Último uso: ${dateLabel(device.last_seen_at)}`;
    info.append(name, status);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-revoke-btn';
    button.textContent = device.current ? 'Desautorizar' : 'Revocar';
    button.disabled = Boolean(device.revoked_at);
    button.addEventListener('click', async () => {
      if (!window.confirm(`¿Desautorizar «${device.name}»?`)) return;
      await adminApi(`/admin/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
      await loadDevices();
    });
    row.append(info, button);
    list.appendChild(row);
  }
  if (!devices.length) list.textContent = 'No hay dispositivos autorizados.';
}

async function loadDevices() {
  const result = await adminApi('/admin/devices');
  renderDevices(result.devices);
}

export function initAdminDeviceManager({ currentDeviceId }) {
  const inviteForm = document.getElementById('adminInviteForm');
  const inviteResult = document.getElementById('adminInviteResult');
  document.getElementById('adminCreateInviteBtn').addEventListener('click', () => {
    inviteForm.hidden = !inviteForm.hidden;
    if (!inviteForm.hidden) document.getElementById('adminInviteLabel').focus();
  });
  document.getElementById('adminConfirmInviteBtn').addEventListener('click', async () => {
    const labelInput = document.getElementById('adminInviteLabel');
    const label = labelInput.value.trim();
    if (!label) return labelInput.focus();
    const result = await adminApi('/admin/activation-tokens', { method: 'POST', body: JSON.stringify({ label }) });
    inviteResult.replaceChildren();
    const labelEl = document.createElement('span');
    labelEl.textContent = `Enlace para ${label}: `;
    const link = document.createElement('code');
    link.textContent = result.activationUrl;
    const copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'admin-device-btn'; copy.textContent = 'Copiar enlace';
    copy.addEventListener('click', async () => { await navigator.clipboard.writeText(result.activationUrl); copy.textContent = 'Copiado'; });
    inviteResult.append(labelEl, link, copy);
    inviteForm.hidden = true; labelInput.value = '';
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
    if (!window.confirm('¿Desautorizar este dispositivo?')) return;
    await adminApi('/auth/logout', { method: 'POST' });
    window.location.reload();
  });
  document.getElementById('adminCloseBtn').addEventListener('click', () => window.closeAdminPanel?.());
  loadDevices().catch((error) => { document.getElementById('adminDevicesList').textContent = error.message; });
  return currentDeviceId;
}
