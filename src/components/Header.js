import { storeConfig } from '../config/store.js';
import { escapeAttribute } from '../utils/html.js';
import { SearchBar } from './SearchBar.js';

export function Header() {
  return `<header class="site-header" id="top">
    <div class="site-header__bar">
      <a class="site-logo" href="#top" aria-label="Glam Studio, ir al inicio">
        <img src="${escapeAttribute(storeConfig.logoUrl)}" alt="Glam Studio" width="74" height="54" data-loaded="1">
      </a>
      <nav class="site-nav" id="siteNav" aria-label="Principal">
        <a href="#top">Inicio</a>
        <a href="#catalogo">Productos</a>
        <a href="#categorias">Categorías</a>
        <a href="${escapeAttribute(storeConfig.whatsappUrl)}" target="_blank" rel="noopener noreferrer">Contacto</a>
      </nav>
      <div class="site-actions">
        <button class="icon-btn" id="searchToggle" type="button" aria-label="Buscar productos" aria-expanded="false" aria-controls="searchBarContainer">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        </button>
        <button class="icon-btn" id="cartButton" type="button" aria-label="Abrir carrito">
          <i class="fas fa-bag-shopping" aria-hidden="true"></i>
          <span class="cart-badge" id="cartBadge" hidden>0</span>
        </button>
        <button class="icon-btn menu-btn" id="menuToggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="siteNav">
          <i class="fas fa-bars" aria-hidden="true"></i>
        </button>
      </div>
    </div>
    ${SearchBar()}
  </header>`;
}
