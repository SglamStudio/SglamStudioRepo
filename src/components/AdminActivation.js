export function AdminActivation() {
  return `<div class="admin-activation-overlay" id="adminActivationOverlay" role="dialog" aria-modal="true" aria-labelledby="activationTitle">
    <form class="admin-activation-box" id="adminActivationForm">
      <h2 id="activationTitle">Activar dispositivo</h2>
      <p>Este enlace autorizará este dispositivo para administrar Glam Studio.</p>
      <label for="activationDeviceName">Nombre del dispositivo</label>
      <input id="activationDeviceName" name="deviceName" maxlength="120" required placeholder="Ej: Mi computador">
      <button class="admin-save-btn" type="submit">Activar dispositivo</button>
      <p class="admin-activation-error" id="activationError" role="alert"></p>
    </form>
  </div>`;
}
