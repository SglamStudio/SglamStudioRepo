import { escapeAttribute, escapeHtml } from '../utils/html.js';
import { productUse } from '../utils/productUse.js';

export function ProductCard(product) {
  const brand = product.displayBrand || product.brand;
  const name = product.displayName || product.name;
  const second = product.secondImage || '';
  const secondImg = second
    ? `<img src="${escapeAttribute(second)}" alt="" aria-hidden="true" loading="lazy" decoding="async" referrerpolicy="no-referrer" class="product-img-second">`
    : '';
  const dots = second ? '<span class="product-img-dots" aria-hidden="true"><i></i><i></i></span>' : '';
  return `<article class="product-card${second ? ' has-second-image' : ''}"
    data-id="${escapeAttribute(product.id || '')}"
    data-name="${escapeAttribute(product.name)}"
    data-brand="${escapeAttribute(product.brand)}"
    data-use="${escapeAttribute(product.description || productUse(product.name, product.category))}"
    data-price="${product.price}"
    data-price-display="${escapeAttribute(product.priceDisplay)}"
    data-img="${escapeAttribute(product.image)}"${second ? `
    data-img2="${escapeAttribute(second)}"` : ''}>
    <div class="product-image-wrap">
      <img src="${escapeAttribute(product.image)}" alt="${escapeAttribute(name)} ${escapeAttribute(brand)}" referrerpolicy="no-referrer" class="product-lazy-img">
      ${secondImg}${dots}
      <button class="fav-btn" type="button" data-action="toggle-favorite" aria-pressed="false" aria-label="Guardar ${escapeAttribute(name)} en favoritos"><i class="far fa-heart" aria-hidden="true"></i></button>
    </div>
    <div class="product-info">
      <div class="product-brand">${escapeHtml(brand)}</div>
      <h3 class="product-name" title="${escapeAttribute(name)}">${escapeHtml(name)}</h3>
      <div class="product-price">${escapeHtml(product.priceDisplay)}</div>
      <button class="add-cart-btn" type="button" data-action="add-to-cart"><i class="fas fa-bag-shopping" aria-hidden="true"></i> Agregar al carrito</button>
    </div>
  </article>`;
}
