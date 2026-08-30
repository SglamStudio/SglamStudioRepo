import { escapeAttribute, escapeHtml } from '../utils/html.js';

export function ProductCard(product) {
  return `<article class="product-card"
    data-id="${escapeAttribute(product.id || '')}"
    data-name="${escapeAttribute(product.name)}"
    data-brand="${escapeAttribute(product.brand)}"
    data-price="${product.price}"
    data-price-display="${escapeAttribute(product.priceDisplay)}"
    data-img="${escapeAttribute(product.image)}">
    <div class="product-image-wrap">
      <img src="${escapeAttribute(product.image)}" alt="${escapeAttribute(product.displayName || product.name)} ${escapeAttribute(product.displayBrand || product.brand)}" referrerpolicy="no-referrer" class="product-lazy-img">
    </div>
    <div class="product-info">
      <div class="product-brand">${escapeHtml(product.displayBrand || product.brand)}</div>
      <div class="product-name">${escapeHtml(product.displayName || product.name)}</div>
      <div class="product-price">${escapeHtml(product.priceDisplay)}</div>
      <button class="add-cart-btn" type="button" data-action="add-to-cart"><i class="fas fa-shopping-bag" aria-hidden="true"></i> Agregar al carrito</button>
    </div>
  </article>`;
}
