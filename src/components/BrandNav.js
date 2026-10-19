import { escapeAttribute, escapeHtml } from '../utils/html.js';
import { brandKey } from '../utils/brandKey.js';

const VISIBLE_BRANDS = 24;

// Marcas del catálogo, de la que tiene más productos a la que tiene menos.
function collectBrands(products) {
  const brands = new Map();
  for (const product of products) {
    const name = (product.displayBrand || product.brand || '').trim();
    if (!name) continue;
    const key = brandKey(name);
    const entry = brands.get(key) || { name, key, count: 0 };
    entry.count += 1;
    brands.set(key, entry);
  }
  return [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}

export function BrandNav(products = []) {
  const brands = collectBrands(products);
  if (!brands.length) return '';
  const link = (brand, index) => `<button class="brand-link${index >= VISIBLE_BRANDS ? ' brand-link--extra' : ''}" type="button" data-brand="${escapeAttribute(brand.key)}" aria-pressed="false">${escapeHtml(brand.name)}</button>`;
  const hasMore = brands.length > VISIBLE_BRANDS;
  return `<nav class="brand-nav" id="marcas" aria-label="Marcas">
    <div class="brand-nav__list" id="brandNav">
      <button class="brand-link is-active" type="button" data-brand="" aria-pressed="true">Todas las marcas</button>${brands.map(link).join('')}
    </div>${hasMore ? `
    <button class="brand-nav__more" id="brandNavMore" type="button" aria-expanded="false">Ver todas las marcas (${brands.length}) <i class="fas fa-chevron-down" aria-hidden="true"></i></button>` : ''}
  </nav>`;
}
