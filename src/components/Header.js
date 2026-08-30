import { storeConfig } from '../config/store.js';
import { escapeAttribute, escapeHtml } from '../utils/html.js';

export function Header() {
  return `<header class="header">
    <div class="sparkle sparkle-1"></div><div class="sparkle sparkle-2"></div>
    <div class="sparkle sparkle-3"></div><div class="sparkle sparkle-4"></div><div class="sparkle sparkle-5"></div>
    <div class="logo-container">
      <img src="${escapeAttribute(storeConfig.logoUrl)}" alt="Glam Studio Logo" referrerpolicy="no-referrer" data-loaded="1">
    </div>
    <div class="header-subtitle">Catálogo de Productos</div>
    <div class="header-tagline">Belleza que encanta</div>
    <div class="header-social">
      <a href="${escapeAttribute(storeConfig.tiktokUrl)}" target="_blank" rel="noopener" class="social-link tiktok-link" aria-label="TikTok">
        <i class="fab fa-tiktok"></i><span>${escapeHtml(storeConfig.tiktokHandle)}</span>
      </a>
    </div>
  </header>`;
}
