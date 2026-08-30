import { adminApi } from './adminAccess.js';

function dateLabel(value) {
  if (!value) return 'Sin uso registrado';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function showDeviceError(message) {
  const result = document.getElementById('adminInviteResult');
  result.textContent = message;
  result.classList.add('admin-error-text');
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
    name.textContent = `${device.name}${device.current ? ' (este dispositivo)' : ''}`;
    const status = document.createElement('span');
    status.textContent = device.revokedAt ? 'Revocado' : `Último uso: ${dateLabel(device.lastSeenAt)}`;
    info.append(name, status);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-revoke-btn';
    button.textContent = device.current ? 'Desautorizar' : 'Revocar';
    button.disabled = Boolean(device.revokedAt);
    button.addEventListener('click', async () => {
      if (!window.confirm(`¿Desautorizar “${device.name}”?`)) return;
      button.disabled = true;
      try {
        await adminApi(`/admin/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
        if (device.current) window.location.reload();
        else await loadDevices();
      } catch (error) {
        showDeviceError(error.message);
        button.disabled = false;
      }
    });
    row.append(info, button);
    list.appendChild(row);
  }
  if (!devices.length) list.textContent = 'No hay dispositivos registrados.';
}

async function loadDevices() {
  const result = await adminApi('/admin/devices');
  renderDevices(result.devices);
}

export function initAdminDeviceManager() {
  const inviteForm = document.getElementById('adminInviteForm');
  const inviteResult = document.getElementById('adminInviteResult');
  const labelInput = document.getElementById('adminInviteLabel');
  document.getElementById('adminCreateInviteBtn').addEventListener('click', () => {
    inviteForm.hidden = !inviteForm.hidden;
    if (!inviteForm.hidden) labelInput.focus();
  });
  document.getElementById('adminConfirmInviteBtn').addEventListener('click', async () => {
    const label = labelInput.value.trim();
    if (!label) return labelInput.focus();
    inviteResult.textContent = 'Generando enlace…';
    inviteResult.classList.remove('admin-error-text');
    try {
      const result = await adminApi('/admin/activation-tokens', {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      inviteResult.replaceChildren();
      const text = document.createElement('span');
      text.textContent = `Enlace para ${label} (vence ${dateLabel(result.expiresAt)}): `;
      const link = document.createElement('code');
      link.textContent = result.activationUrl;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'admin-device-btn';
      copy.textContent = 'Copiar enlace';
      copy.addEventListener('click', async () => {
        await copyText(result.activationUrl);
        copy.textContent = 'Copiado';
      });
      inviteResult.append(text, link, copy);
      inviteForm.hidden = true;
      labelInput.value = '';
    } catch (error) {
      showDeviceError(error.message);
    }
  });
  document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
    if (!window.confirm('¿Cerrar la sesión administrativa en este dispositivo?')) return;
    try {
      await adminApi('/auth/logout', { method: 'POST' });
      window.location.reload();
    } catch (error) {
      showDeviceError(error.message);
    }
  });
  loadDevices().catch((error) => {
    document.getElementById('adminDevicesList').textContent = error.message;
  });
}
