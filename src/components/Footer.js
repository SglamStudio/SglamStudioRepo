import { storeConfig } from '../config/store.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';

export function Footer() {
  return `<footer class="site-footer">
    <div class="site-footer__inner">
      <img class="footer-logo" src="${escapeAttribute(storeConfig.logoLightUrl)}" alt="Glam Studio" width="101" height="48">
      <p class="footer-tagline">Maquillaje y cuidado de la piel. Tu pedido llega por WhatsApp.</p>
      <div class="footer-links">
        <a href="${escapeAttribute(storeConfig.whatsappUrl)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp" aria-hidden="true"></i> WhatsApp</a>
        <a href="${escapeAttribute(storeConfig.tiktokUrl)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-tiktok" aria-hidden="true"></i> ${escapeHtml(storeConfig.tiktokHandle)}</a>
      </div>
    </div>
    <p class="footer-legal">© 2026 Glam Studio · Todos los derechos reservados</p>
  </footer>`;
}
